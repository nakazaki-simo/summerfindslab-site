// Probe addConnection schema variants by hitting deliberate invalid values.
import { spawnSync } from "node:child_process";

const WID = "F17nobe1FFOmJS2U";

function call(args) {
    const r = spawnSync(
        process.execPath,
        ["n8n/scripts/mcp-call.mjs", "raw", "update_workflow", JSON.stringify(args)],
        { encoding: "utf8" },
    );
    return r.stdout;
}

const probes = [
    {
        type: "addConnection",
        source: "Start - Manual Trigger",
        target: "Load Sample Products",
        sourceOutput: "main",
        sourceOutputIndex: 1,
    },
    {
        type: "addConnection",
        source: "Start - Manual Trigger",
        target: "Load Sample Products",
        outputIndex: 1,
    },
    {
        type: "addConnection",
        source: "Start - Manual Trigger",
        target: "Load Sample Products",
        sourceIndex: 1,
    },
];

for (const p of probes) {
    console.log("\n=== probe:", JSON.stringify(p));
    console.log(call({ workflowId: WID, operations: [p] }));
}
