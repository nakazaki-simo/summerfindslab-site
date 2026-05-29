/**
 * lib/pin-pipeline/csv-export.js
 * --------------------------------------------------------------------------
 * Free-tier fallback: turn `data/pinterest-pins.json` into a Canva-ready
 * Bulk Create CSV.
 *
 * Why this exists:
 *   The Brand Template + Autofill API is a paid Canva Enterprise feature.
 *   Until that's enabled, you can still generate pins programmatically by:
 *     1. Building one Canva design with named placeholders.
 *     2. Apps -> "Bulk Create" -> upload this CSV.
 *     3. Click "Connect data" and map columns to placeholders.
 *     4. Apply -> 50 pins generated in one shot.
 *
 * This is the same data the Connect API uses, just shipped via CSV.
 * --------------------------------------------------------------------------
 */

import fs from "node:fs/promises";
import path from "node:path";

function csvEscape(v) {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
}

/**
 * Convert pins -> CSV string with one row per pin and columns matching
 * the field names every Brand Template should expose.
 */
export function pinsToBulkCreateCsv(pins) {
    const headers = [
        "id",
        "formula",
        "headline",
        "subhead",
        "cta",
        "brand",
        "price",
        "rating",
        "review_count",
        "big_number",
        "sticker_1",
        "sticker_2",
        "sticker_3",
        "product_image",
        "link",
        "board",
        "description",
        "hashtags",
    ];
    const rows = pins.map((p) => {
        const stickers = p.secondaryStickers || [];
        return [
            p.id,
            p.formulaId,
            p.title || p.textOverlay || "",
            p.cta || "Tap to shop",
            p.cta || "Tap to shop",
            "summerfindslab.com",
            "", // price filled at template build time if not in pin record
            "",
            "",
            (p.title || "").match(/\d+/)?.[0] || "",
            stickers[0] || "",
            stickers[1] || "",
            stickers[2] || "",
            p.sourceImage || "",
            p.link || "",
            p.boardSuggestion || "",
            p.description || "",
            (p.hashtags || []).join(" "),
        ];
    });
    return [headers, ...rows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\n");
}

export async function writeBulkCreateCsv({ pins, outFile }) {
    const csv = pinsToBulkCreateCsv(pins);
    const file = path.resolve(process.cwd(), outFile);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, csv, "utf8");
    return { file, rows: pins.length };
}
