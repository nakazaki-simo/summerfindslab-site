#!/usr/bin/env node
/**
 * scripts/canva/generate-pins.mjs
 * --------------------------------------------------------------------------
 * Run the full pin pipeline: read data/pinterest-pins.json + data/products.json,
 * push every configured pin through autofill -> export, write results to
 * data/canva/exports.json.
 *
 * Filters:
 *   --formula=<id>   only pins for that formula
 *   --kind=<product|guide|category>
 *   --limit=<n>      stop after n pins
 *   --dry            only print what would run, don't call Canva
 *
 * Usage:
 *   npm run canva:generate
 *   npm run canva:generate -- --formula=price-tag-find --limit=3
 *   npm run canva:generate -- --dry
 * --------------------------------------------------------------------------
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadEnv, parseArgs, pretty } from "./_shared.mjs";
loadEnv();

const args = parseArgs();

const root = process.cwd();
const pins = JSON.parse(
    await fs.readFile(path.join(root, "data", "pinterest-pins.json"), "utf8"),
);
const products = JSON.parse(
    await fs.readFile(path.join(root, "data", "products.json"), "utf8"),
);

const filter = {
    formulaId: args.formula,
    kind: args.kind,
    limit: args.limit ? Number(args.limit) : undefined,
};

if (args.dry) {
    const { isFormulaConfigured, listConfiguredFormulas } = await import(
        "../../lib/pin-pipeline/templates.js"
    );
    const configured = listConfiguredFormulas();
    const candidates = pins
        .filter((p) => !filter.formulaId || p.formulaId === filter.formulaId)
        .filter((p) => !filter.kind || p.kind === filter.kind)
        .filter((p) => isFormulaConfigured(p.formulaId));
    const limited = filter.limit ? candidates.slice(0, filter.limit) : candidates;
    console.log("Configured formulas:", pretty(configured));
    console.log(
        `Pins ready to generate: ${limited.length} of ${pins.length} total`,
    );
    for (const p of limited.slice(0, 25)) {
        console.log(` - ${p.id}  formula=${p.formulaId}  kind=${p.kind}`);
    }
    if (limited.length > 25) console.log(` ... +${limited.length - 25} more`);
    process.exit(0);
}

const { generatePins } = await import("../../lib/pin-pipeline/generate.js");

const summary = await generatePins({
    pins,
    products,
    filter,
    onProgress: (e) => {
        if (e.phase === "start") {
            console.log(`[${e.index}/${e.total}] -> ${e.pinId}`);
        } else if (e.phase === "error") {
            console.log(`  ! error on ${e.pinId}: ${e.error}`);
        } else if (e.phase === "done") {
            console.log(`  ok ${e.pinId}`);
        } else if (e.phase) {
            process.stdout.write(`  · ${e.phase}\n`);
        }
    },
});
console.log("\nDone:", pretty({
    attempted: summary.attempted,
    succeeded: summary.succeeded,
    skipped: summary.skipped,
    errored: summary.errored,
}));
