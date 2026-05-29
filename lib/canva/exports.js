/**
 * lib/canva/exports.js
 * --------------------------------------------------------------------------
 * Export a Canva design to a downloadable PNG / JPG / PDF.
 *
 * For Pinterest we want PNG at 1000x1500 (2:3). The actual size comes from
 * the Brand Template canvas — exports just rasterise it.
 *
 * Flow:
 *   1. createExportJob(designId, format) -> { job: { id } }
 *   2. pollJob until success -> { urls: [...] }   (signed URLs, valid ~24h)
 *
 * Reference: https://www.canva.dev/docs/connect/api-reference/exports/
 * --------------------------------------------------------------------------
 */

import { canva, pollJob } from "./client.js";

export async function createExportJob({ designId, format = "png" }) {
    if (!designId) throw new Error("[canva] designId required");
    return canva.post(`/exports`, {
        design_id: designId,
        format: { type: format },
    });
}

export async function exportAndWait({ designId, format = "png", onTick }) {
    const created = await createExportJob({ designId, format });
    const jobId = created?.job?.id;
    if (!jobId) {
        const err = new Error("[canva] export returned no job id");
        err.canva = created;
        throw err;
    }
    const final = await pollJob({
        url: `/exports/${jobId}`,
        intervalMs: 2000,
        timeoutMs: 120_000,
        onTick,
    });
    // final.job.urls (or final.urls) -> [{ url }]
    const urls =
        final.job?.urls || final.urls || final.job?.result?.urls || [];
    return urls.map((u) => (typeof u === "string" ? u : u.url)).filter(Boolean);
}
