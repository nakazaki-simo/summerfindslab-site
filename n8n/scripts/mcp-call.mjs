#!/usr/bin/env node
/**
 * mcp-call.mjs
 * --------------------------------------------------------------------------
 * Minimal client for the n8n MCP Server's streamable HTTP transport.
 * Used as a fallback when the Kiro MCP layer can't reach n8n directly,
 * so we can still inspect, search, and manage workflows from the CLI.
 *
 * Usage:
 *   node n8n/scripts/mcp-call.mjs list
 *   node n8n/scripts/mcp-call.mjs get-workflow <id>
 *   node n8n/scripts/mcp-call.mjs search <query>
 *   node n8n/scripts/mcp-call.mjs raw <method> [json-params]
 *   node n8n/scripts/mcp-call.mjs tools
 *
 * Env (loaded from n8n/.env if present):
 *   N8N_MCP_URL   = https://<your-n8n>/mcp-server/http
 *   N8N_MCP_TOKEN = <jwt access token from n8n -> Settings -> Instance-level MCP -> Access Token>
 * --------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, "..", ".env");

function loadDotEnv(p) {
    if (!existsSync(p)) return {};
    const out = {};
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
    return out;
}
const fileEnv = loadDotEnv(ENV_FILE);
const URL_ = process.env.N8N_MCP_URL || fileEnv.N8N_MCP_URL;
const TOKEN = process.env.N8N_MCP_TOKEN || fileEnv.N8N_MCP_TOKEN;
if (!URL_ || !TOKEN) {
    console.error("Missing N8N_MCP_URL or N8N_MCP_TOKEN. Set them in n8n/.env or env.");
    process.exit(2);
}

let sessionId = null;
let nextId = 1;

function parseSse(text) {
    // n8n's MCP server replies with `event: message\ndata: {...}\n\n`.
    const out = [];
    for (const block of text.split(/\r?\n\r?\n/)) {
        const dataLine = block.split(/\r?\n/).find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        try {
            out.push(JSON.parse(dataLine.slice(5).trim()));
        } catch {
            /* skip */
        }
    }
    return out;
}

async function rpc(method, params = undefined, { notification = false } = {}) {
    const body = notification
        ? { jsonrpc: "2.0", method, params }
        : { jsonrpc: "2.0", id: nextId++, method, params };
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${TOKEN}`,
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;

    const res = await fetch(URL_, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) sessionId = sid;
    if (notification) return null;

    const text = await res.text();
    const ct = res.headers.get("content-type") || "";
    let payload;
    if (ct.includes("text/event-stream")) {
        const events = parseSse(text);
        payload = events.find((e) => e.id === body.id) || events[0];
    } else if (ct.includes("application/json")) {
        payload = JSON.parse(text);
    } else {
        throw new Error(
            `Unexpected ${res.status} ${ct}: ${text.slice(0, 300)}`,
        );
    }
    if (payload?.error) {
        throw new Error(
            `RPC ${method} -> ${payload.error.code}: ${payload.error.message}`,
        );
    }
    return payload?.result;
}

async function init() {
    const result = await rpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "summerfindslab-mcp-cli", version: "0.1.0" },
    });
    await rpc("notifications/initialized", {}, { notification: true });
    return result;
}

async function listTools() {
    return rpc("tools/list");
}

async function callTool(name, args = {}) {
    return rpc("tools/call", { name, arguments: args });
}

function pretty(x) {
    return JSON.stringify(x, null, 2);
}

const [, , cmd, ...rest] = process.argv;

(async () => {
    const info = await init();
    if (cmd === "info") {
        console.log(pretty(info));
        return;
    }

    if (cmd === "tools") {
        const t = await listTools();
        console.log("Available tools:");
        for (const tool of t.tools || []) {
            console.log(`- ${tool.name}: ${tool.description?.slice(0, 120) || ""}`);
        }
        return;
    }

    if (cmd === "list") {
        const t = await listTools();
        const candidates = (t.tools || [])
            .map((x) => x.name)
            .filter((n) => /list|search/i.test(n) && /workflow/i.test(n));
        if (!candidates.length) {
            console.error("No workflow listing tool found. Available tools:");
            for (const tool of t.tools || []) console.error("- " + tool.name);
            process.exit(3);
        }
        const toolName = candidates[0];
        console.log(`Using tool: ${toolName}`);
        const r = await callTool(toolName, {});
        console.log(pretty(r));
        return;
    }

    if (cmd === "search") {
        const q = rest.join(" ");
        const t = await listTools();
        const tool = (t.tools || []).find((x) => /search.*workflow/i.test(x.name));
        if (!tool) throw new Error("No search_workflows tool exposed.");
        console.log(`Using tool: ${tool.name} with query=${JSON.stringify(q)}`);
        const r = await callTool(tool.name, { query: q });
        console.log(pretty(r));
        return;
    }

    if (cmd === "get-workflow") {
        const id = rest[0];
        if (!id) throw new Error("usage: get-workflow <id>");
        const t = await listTools();
        const tool =
            (t.tools || []).find((x) => /^get_workflow$/i.test(x.name)) ||
            (t.tools || []).find((x) => /workflow.*get|get.*workflow/i.test(x.name));
        if (!tool) {
            console.error("No get_workflow tool exposed. Tools available:");
            for (const x of t.tools || []) console.error("- " + x.name);
            process.exit(3);
        }
        console.log(`Using tool: ${tool.name} with id=${id}`);
        // Try common parameter shapes. n8n's tool docs say `workflowId`.
        let r;
        for (const args of [{ workflowId: id }, { id }, { workflow_id: id }]) {
            try {
                r = await callTool(tool.name, args);
                break;
            } catch (e) {
                if (!/Invalid|required|missing/i.test(e.message)) throw e;
            }
        }
        console.log(pretty(r));
        return;
    }

    if (cmd === "raw") {
        const [name, json] = rest;
        if (!name) throw new Error("usage: raw <toolName> [jsonArgs]");
        const args = json ? JSON.parse(json) : {};
        console.log(pretty(await callTool(name, args)));
        return;
    }

    console.error(
        "Commands: info | tools | list | search <query> | get-workflow <id> | raw <toolName> [jsonArgs]",
    );
    process.exit(1);
})().catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
});
