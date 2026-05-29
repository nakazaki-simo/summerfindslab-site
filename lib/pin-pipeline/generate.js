/**
 * lib/pin-pipeline/generate.js
 * --------------------------------------------------------------------------
 * The orchestrator. Given a list of pin records (data/pinterest-pins.json),
 * it:
 *
 *   1. Uploads each pin's source product image to Canva once (cached by URL).
 *   2. For every pin whose formula has a Brand Template configured, runs:
 *        autofill -> wait -> export PNG -> collect URLs.
 *   3. Logs a row per pin to data/canva/exports.json so n8n / a Pinterest
 *      scheduler can pick it up.
 *
 * Designed to be safely re-runnable: re-runs reuse uploaded asset ids
 * via an in-memory cache for one run, and append-only on the export log.
 *
 * The pipeline degrades gracefully:
 *   - Missing template id -> pin is skipped with reason "no_template".
 *   - Missing product image -> pin is skipped with reason "no_image".
 *   - API error -> pin is logged with reason "error" and the run continues.
 * --------------------------------------------------------------------------
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getCanvaConfig } from "../canva/config.js";
import { uploadAssetFromUrl } from "../canva/assets.js";
import { autofillAndWait } from "../canva/autofill.js";
import { exportAndWait } from "../canva/exports.js";
import {
    buildAutofillData,
    getBrandTemplateId,
    isFormulaConfigured,
} from "./templates.js";

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function appendExportLog(entry) {
    const cfg = getCanvaConfig();
    const file = path.resolve(process.cwd(), cfg.exportLog);
    await fs.mkdir(path.dirname(file), { recursive: true });
    let arr = [];
    try {
        arr = JSON.parse(await fs.readFile(file, "utf8"));
        if (!Array.isArray(arr)) arr = [];
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
    arr.push(entry);
    await fs.writeFile(file, JSON.stringify(arr, null, 2));
}

/**
 * Generate a single pin end-to-end. Exported so n8n / API routes can
 * call this on a single record without spinning up the full batch.
 */
export async function generatePin({
    pin,
    product,
    assetCache = new Map(),
    onProgress,
}) {
    const formulaId = pin.formulaId;
    const templateId = getBrandTemplateId(formulaId);
    if (!templateId) {
        return {
            pinId: pin.id,
            status: "skipped",
            reason: "no_template",
            formulaId,
        };
    }
    if (!pin.sourceImage) {
        return {
            pinId: pin.id,
            status: "skipped",
            reason: "no_image",
            formulaId,
        };
    }

    onProgress?.({ phase: "upload", pinId: pin.id });
    let asset = assetCache.get(pin.sourceImage);
    if (!asset) {
        asset = await uploadAssetFromUrl(
            pin.sourceImage,
            (product?.title || pin.title || "product").slice(0, 60),
        );
        assetCache.set(pin.sourceImage, asset);
    }

    onProgress?.({ phase: "autofill", pinId: pin.id });
    const data = buildAutofillData({ pin, product, productImageAsset: asset });
    const design = await autofillAndWait({
        brandTemplateId: templateId,
        title: pin.title?.slice(0, 60) || pin.id,
        data,
    });
    const designId = design?.design?.id || design?.id;
    if (!designId) {
        throw new Error(
            `[pin-pipeline] autofill returned no design id for ${pin.id}`,
        );
    }

    onProgress?.({ phase: "export", pinId: pin.id });
    const urls = await exportAndWait({ designId, format: "png" });

    return {
        pinId: pin.id,
        status: "ok",
        formulaId,
        designId,
        editUrl: design?.design?.urls?.edit_url,
        viewUrl: design?.design?.urls?.view_url,
        thumbnail: design?.design?.thumbnail?.url,
        exportUrls: urls,
        boardSuggestion: pin.boardSuggestion,
        link: pin.link,
        description: pin.description,
        hashtags: pin.hashtags,
        title: pin.title,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Batch entry. Pass:
 *  - pins:   from data/pinterest-pins.json
 *  - products (optional): from data/products.json (keyed lookup by productId)
 *  - filter: { formulaId, kind, limit } to scope a run
 *  - onProgress callback for CLI logging
 */
export async function generatePins({
    pins,
    products = [],
    filter = {},
    onProgress,
}) {
    const cfg = getCanvaConfig();
    const productById = new Map(products.map((p) => [p.id, p]));
    const assetCache = new Map();

    let candidates = pins;
    if (filter.formulaId) {
        candidates = candidates.filter((p) => p.formulaId === filter.formulaId);
    }
    if (filter.kind) {
        candidates = candidates.filter((p) => p.kind === filter.kind);
    }
    candidates = candidates.filter((p) => isFormulaConfigured(p.formulaId));
    if (filter.limit) candidates = candidates.slice(0, filter.limit);

    const results = [];
    let i = 0;
    for (const pin of candidates) {
        i += 1;
        onProgress?.({ phase: "start", pinId: pin.id, index: i, total: candidates.length });
        try {
            const res = await generatePin({
                pin,
                product: pin.productId ? productById.get(pin.productId) : null,
                assetCache,
                onProgress,
            });
            results.push(res);
            await appendExportLog(res);
            onProgress?.({ phase: "done", pinId: pin.id, index: i, total: candidates.length });
        } catch (err) {
            const failure = {
                pinId: pin.id,
                status: "error",
                formulaId: pin.formulaId,
                error: err.message,
                generatedAt: new Date().toISOString(),
            };
            results.push(failure);
            await appendExportLog(failure);
            onProgress?.({ phase: "error", pinId: pin.id, error: err.message });
        }
        await sleep(cfg.batchDelayMs);
    }
    return {
        attempted: candidates.length,
        succeeded: results.filter((r) => r.status === "ok").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        errored: results.filter((r) => r.status === "error").length,
        results,
    };
}
