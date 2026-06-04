/**
 * n8n/scripts/validate-local.mjs
 * --------------------------------------------------------------------------
 * Offline structural validator for an exported n8n workflow JSON. This is a
 * LOCAL stand-in for the n8n MCP `validate_workflow` tool when the MCP server
 * is not reachable. It checks the things that commonly break an import/run:
 *
 *   - top-level shape (name, nodes[], connections{})
 *   - every node has id, name, type, typeVersion, position
 *   - node names are unique
 *   - every Code node's jsCode parses as valid JavaScript (new Function)
 *   - every connection source + target references an existing node
 *   - trigger node(s) present
 *   - splitInBatches nodes expose two outputs (done[0], loop[1]) and the loop
 *     body returns to the loop node
 *
 * Usage: node n8n/scripts/validate-local.mjs n8n/workflows/<file>.json
 * Exit 0 = clean, 1 = errors found.
 * --------------------------------------------------------------------------
 */

import fs from "node:fs";

const file = process.argv[2];
if (!file) {
    console.error("usage: node n8n/scripts/validate-local.mjs <workflow.json>");
    process.exit(2);
}

const errors = [];
const warnings = [];

let wf;
try {
    wf = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
    console.error("INVALID JSON:", e.message);
    process.exit(1);
}

if (!wf.name) errors.push("workflow.name missing");
if (!Array.isArray(wf.nodes)) errors.push("workflow.nodes is not an array");
if (!wf.connections || typeof wf.connections !== "object")
    errors.push("workflow.connections missing");

const nodes = wf.nodes || [];
const names = new Set();
let triggerCount = 0;

for (const n of nodes) {
    const where = `node "${n.name || n.id || "?"}"`;
    if (!n.id) errors.push(`${where}: missing id`);
    if (!n.name) errors.push(`${where}: missing name`);
    if (!n.type) errors.push(`${where}: missing type`);
    if (n.typeVersion == null) errors.push(`${where}: missing typeVersion`);
    if (!Array.isArray(n.position)) warnings.push(`${where}: missing position`);
    if (names.has(n.name)) errors.push(`duplicate node name: ${n.name}`);
    names.add(n.name);

    // Triggers / entry points: explicit *Trigger nodes AND webhook nodes
    // (a webhook is an entry point even though its type isn't "*Trigger").
    if (/trigger/i.test(n.type) || n.type === "n8n-nodes-base.webhook") triggerCount++;

    // Validate Code node bodies parse as JS.
    if (n.type === "n8n-nodes-base.code") {
        const code = n.parameters?.jsCode;
        if (typeof code !== "string" || !code.trim()) {
            errors.push(`${where}: code node has empty jsCode`);
        } else {
            try {
                // eslint-disable-next-line no-new-func
                new Function(code);
            } catch (e) {
                errors.push(`${where}: jsCode syntax error -> ${e.message}`);
            }
        }
    }

    // HTTP nodes must have a url.
    if (n.type === "n8n-nodes-base.httpRequest") {
        if (!n.parameters?.url) errors.push(`${where}: httpRequest missing url`);
    }
}

if (triggerCount === 0) errors.push("no trigger node found");

// Connection integrity: every source + destination must exist.
for (const [src, conn] of Object.entries(wf.connections || {})) {
    if (!names.has(src)) errors.push(`connection source "${src}" is not a node`);
    const mains = (conn.main || []);
    mains.forEach((outputs, outIdx) => {
        (outputs || []).forEach((c) => {
            if (!c || !c.node) {
                errors.push(`connection from "${src}" output ${outIdx} has no target node`);
            } else if (!names.has(c.node)) {
                errors.push(`connection from "${src}" -> "${c.node}" (target not found)`);
            }
        });
    });
}

// splitInBatches sanity: must have 2 outputs and the loop body must return.
for (const n of nodes) {
    if (n.type === "n8n-nodes-base.splitInBatches") {
        const outs = wf.connections?.[n.name]?.main || [];
        if (outs.length < 2) {
            errors.push(`splitInBatches "${n.name}" should wire 2 outputs (done[0], loop[1])`);
        }
        // Does anything connect back to this loop node?
        const returnsToLoop = Object.values(wf.connections || {}).some((conn) =>
            (conn.main || []).some((outputs) =>
                (outputs || []).some((c) => c && c.node === n.name)
            )
        );
        if (!returnsToLoop) {
            warnings.push(`splitInBatches "${n.name}" has no node returning to it (loop may not iterate)`);
        }
    }
}

console.log(`\nValidated: ${file}`);
console.log(`Nodes: ${nodes.length} | Triggers: ${triggerCount} | Connections: ${Object.keys(wf.connections || {}).length}`);
if (warnings.length) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    warnings.forEach((w) => console.log("  - " + w));
}
if (errors.length) {
    console.log(`\nERRORS (${errors.length}):`);
    errors.forEach((e) => console.log("  - " + e));
    process.exit(1);
}
console.log("\nOK: no structural errors.\n");
process.exit(0);
