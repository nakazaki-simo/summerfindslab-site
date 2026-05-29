#!/usr/bin/env node
/**
 * scripts/canva/export-csv.mjs
 * --------------------------------------------------------------------------
 * Free-tier path: turn data/pinterest-pins.json into a Canva Bulk Create CSV.
 * Output: content/pinterest/canva-bulk-create.csv
 *
 * Usage:
 *   npm run canva:csv
 * --------------------------------------------------------------------------
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./_shared.mjs";
loadEnv();

const { writeBulkCreateCsv } = await import(
    "../../lib/pin-pipeline/csv-export.js"
);

const root = process.cwd();
const pins = JSON.parse(
    await fs.readFile(path.join(root, "data", "pinterest-pins.json"), "utf8"),
);

const out = await writeBulkCreateCsv({
    pins,
    outFile: "content/pinterest/canva-bulk-create.csv",
});
console.log(`[canva] CSV ready: ${out.file} (${out.rows} rows)`);
console.log(
    "Drop it into Canva > Apps > Bulk Create, then map columns to your template placeholders.",
);
