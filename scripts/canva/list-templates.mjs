#!/usr/bin/env node
/**
 * scripts/canva/list-templates.mjs
 * --------------------------------------------------------------------------
 * Print every Canva Brand Template the connected account has, plus the
 * field schema (data set) for each one. Use the printed ids to populate
 * the env vars referenced in lib/pin-pipeline/templates.js.
 *
 * Usage:
 *   npm run canva:list-templates
 *   npm run canva:list-templates -- --query=pinterest
 * --------------------------------------------------------------------------
 */

import { loadEnv, parseArgs, pretty } from "./_shared.mjs";
loadEnv();

const args = parseArgs();

const {
    listAllBrandTemplates,
    getBrandTemplateDataset,
} = await import("../../lib/canva/brand-templates.js");

try {
    const templates = await listAllBrandTemplates({ query: args.query });
    if (!templates.length) {
        console.log(
            "[canva] No brand templates found. Brand Templates require a Canva Enterprise plan; if you're on Free/Pro use the CSV bulk-create flow instead (npm run canva:csv).",
        );
        process.exit(0);
    }
    for (const t of templates) {
        console.log("\n=================================================");
        console.log(`[${t.id}]  ${t.title}`);
        console.log("update_at:", t.updated_at);
        try {
            const ds = await getBrandTemplateDataset(t.id);
            const fields = ds?.dataset || {};
            const summary = Object.entries(fields).map(([name, def]) => ({
                name,
                type: def.type,
            }));
            console.log("fields:", pretty(summary));
        } catch (err) {
            console.log("dataset error:", err.message);
        }
    }
} catch (err) {
    console.error("[canva] list-templates failed:", err.message);
    if (err.canva) console.error(pretty(err.canva));
    process.exit(1);
}
