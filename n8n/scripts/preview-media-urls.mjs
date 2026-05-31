/**
 * Offline preview of the media_source.url the publisher will send per pin,
 * given SITE_URL. Mirrors the Build Publish Queue logic for the media field
 * only (no Pinterest calls). Pure inspection aid.
 *
 * Usage: node n8n/scripts/preview-media-urls.mjs [SITE_URL]
 */
import fs from "node:fs";

const SITE = (process.argv[2] || "https://summerfindslab-site.vercel.app").replace(/\/+$/, "");
const pins = JSON.parse(fs.readFileSync(new URL("../../data/pinterest-pins.json", import.meta.url)));
const list = Array.isArray(pins) ? pins : pins.pins || [];

let satori = 0;
let fallback = 0;
const sample = [];

for (const pin of list) {
    const productRef = pin.productId || (pin.kind === "product" ? pin.id : "");
    let url = pin.sourceImage;
    let via = "sourceImage";
    if (SITE && productRef && pin.formulaId) {
        url =
            SITE +
            "/api/pins/render?id=" +
            encodeURIComponent(productRef) +
            "&formula=" +
            encodeURIComponent(pin.formulaId);
        via = "satori";
    }
    if (via === "satori") satori++;
    else fallback++;
    if (sample.length < 6) sample.push({ pinId: pin.id, kind: pin.kind, via, url });
}

console.log(`SITE_URL = ${SITE}`);
console.log(`pins total: ${list.length} | satori: ${satori} | sourceImage fallback: ${fallback}\n`);
console.log("Sample media_source.url:");
for (const s of sample) {
    console.log(`  [${s.via}] ${s.kind.padEnd(8)} ${s.pinId}`);
    console.log(`        -> ${s.url}`);
}
