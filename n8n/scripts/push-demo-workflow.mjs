#!/usr/bin/env node
/**
 * push-demo-workflow.mjs
 * --------------------------------------------------------------------------
 * Pushes a small, visible demo workflow into the n8n cloud workflow at
 * F17nobe1FFOmJS2U via the MCP server. Designed so the user can refresh
 * https://summerfindslabdaily.app.n8n.cloud/workflow/F17nobe1FFOmJS2U
 * and immediately see nodes appear on the canvas.
 *
 * The workflow:
 *   Manual Trigger -> Load Sample Products (Code) -> Build Pinterest Pin (Code)
 *
 * Idempotent enough: it sets a friendly name and pushes the three nodes
 * with a simple chain. If the workflow already has nodes with the same
 * names the operations will fail loudly so we know to clean up first.
 * --------------------------------------------------------------------------
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "mcp-call.mjs");
const WORKFLOW_ID = "F17nobe1FFOmJS2U";

function call(toolName, args) {
    const res = spawnSync(
        process.execPath,
        [CLI, "raw", toolName, JSON.stringify(args)],
        { encoding: "utf8" },
    );
    if (res.status !== 0) {
        console.error(res.stdout);
        console.error(res.stderr);
        throw new Error(`mcp-call ${toolName} failed (exit ${res.status})`);
    }
    const out = res.stdout;
    let parsed;
    try {
        parsed = JSON.parse(out);
    } catch (e) {
        throw new Error(`mcp-call ${toolName} returned non-JSON:\n${out}`);
    }
    if (parsed.isError) {
        const msg =
            parsed.content?.[0]?.text || JSON.stringify(parsed).slice(0, 500);
        throw new Error(`${toolName} -> ${msg}`);
    }
    return parsed.structuredContent || parsed;
}

const loadProductsCode = `// Three sample summer-finds-lab products.
// Replace with a real source (Sheet, CSV, DB) when ready.
return [
  { sku: 'SUM-001', title: 'Linen Beach Cover-Up Dress', price: 39.99, image_url: 'https://example.com/img/sum-001.jpg', affiliate_url: 'https://amzn.to/sum-001' },
  { sku: 'SUM-002', title: 'Mini Portable Blender',      price: 24.50, image_url: 'https://example.com/img/sum-002.jpg', affiliate_url: 'https://amzn.to/sum-002' },
  { sku: 'SUM-003', title: 'UV-Protective Beach Tote',   price: 18.00, image_url: 'https://example.com/img/sum-003.jpg', affiliate_url: 'https://amzn.to/sum-003' }
].map(p => ({ json: p }));`;

const buildPinCode = `// Build a single Pinterest-ready pin record per product.
// Demonstrates the same pattern WF-02 uses, in 10 lines.
return $input.all().map(({ json: p }) => ({
  json: {
    sku: p.sku,
    pin_title: p.title + ' under $' + Math.ceil(p.price),
    pin_description: p.title + ' - tap to shop on Amazon. #summerfinds #amazonfinds',
    pin_image: p.image_url,
    pin_link: p.affiliate_url + '?utm_source=pinterest&utm_medium=social&utm_campaign=summer-2026',
    hashtags: ['#summerfinds', '#amazonfinds', '#summer2026']
  }
}));`;

console.log("== Pushing demo workflow into", WORKFLOW_ID, "==\\n");

// 1. Friendly name so it's obvious in the workflows list.
console.log("1) Set workflow metadata (name)");
call("update_workflow", {
    workflowId: WORKFLOW_ID,
    operations: [
        {
            type: "setWorkflowMetadata",
            name: "Summer Finds Lab — Hello (demo)",
        },
    ],
});

// 2. Add the three nodes.
console.log("2) Add Manual Trigger");
call("update_workflow", {
    workflowId: WORKFLOW_ID,
    operations: [
        {
            type: "addNode",
            node: {
                name: "Start - Manual Trigger",
                type: "n8n-nodes-base.manualTrigger",
                typeVersion: 1,
                position: [240, 300],
                parameters: {},
            },
        },
    ],
});

console.log("3) Add Load Sample Products (Code)");
call("update_workflow", {
    workflowId: WORKFLOW_ID,
    operations: [
        {
            type: "addNode",
            node: {
                name: "Load Sample Products",
                type: "n8n-nodes-base.code",
                typeVersion: 2,
                position: [460, 300],
                parameters: {
                    language: "javaScript",
                    jsCode: loadProductsCode,
                },
            },
        },
    ],
});

console.log("4) Add Build Pinterest Pin (Code)");
call("update_workflow", {
    workflowId: WORKFLOW_ID,
    operations: [
        {
            type: "addNode",
            node: {
                name: "Build Pinterest Pin",
                type: "n8n-nodes-base.code",
                typeVersion: 2,
                position: [680, 300],
                parameters: {
                    language: "javaScript",
                    jsCode: buildPinCode,
                },
            },
        },
    ],
});

// 3. Wire them up.
console.log("5) Connect Manual -> Load Sample Products");
call("update_workflow", {
    workflowId: WORKFLOW_ID,
    operations: [
        {
            type: "addConnection",
            source: "Start - Manual Trigger",
            target: "Load Sample Products",
        },
    ],
});

console.log("6) Connect Load Sample Products -> Build Pinterest Pin");
call("update_workflow", {
    workflowId: WORKFLOW_ID,
    operations: [
        {
            type: "addConnection",
            source: "Load Sample Products",
            target: "Build Pinterest Pin",
        },
    ],
});

console.log(
    "\\nDone. Refresh https://summerfindslabdaily.app.n8n.cloud/workflow/" +
    WORKFLOW_ID,
);
