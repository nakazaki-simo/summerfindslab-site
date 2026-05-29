/**
 * lib/canva/autofill.js
 * --------------------------------------------------------------------------
 * Generate a Canva design from a Brand Template + a data payload.
 *
 * Flow:
 *   1. createAutofillJob(templateId, data) -> { job: { id, status } }
 *   2. pollJob until success -> { design: { id, urls, thumbnail } }
 *
 * `data` shape (Canva Connect spec):
 *   {
 *     "field_name_in_template": { type: "text",  text: "..." },
 *     "image_field_name":       { type: "image", asset_id: "..." }
 *   }
 *
 * Reference: https://www.canva.dev/docs/connect/api-reference/autofills/
 * --------------------------------------------------------------------------
 */

import { canva, pollJob } from "./client.js";

export async function createAutofillJob({ brandTemplateId, data, title }) {
    if (!brandTemplateId) throw new Error("[canva] brandTemplateId required");
    if (!data || typeof data !== "object") {
        throw new Error("[canva] autofill `data` object required");
    }
    const body = { brand_template_id: brandTemplateId, data };
    if (title) body.title = title;
    return canva.post(`/autofills`, body);
}

export async function getAutofillJob(jobId) {
    return canva.get(`/autofills/${jobId}`);
}

/**
 * High-level: kick off autofill and wait for the resulting design.
 * Returns the design payload (id, urls, thumbnail).
 */
export async function autofillAndWait({ brandTemplateId, data, title, onTick }) {
    const created = await createAutofillJob({ brandTemplateId, data, title });
    const jobId = created?.job?.id;
    if (!jobId) {
        const err = new Error("[canva] autofill returned no job id");
        err.canva = created;
        throw err;
    }
    const final = await pollJob({
        url: `/autofills/${jobId}`,
        intervalMs: 2000,
        timeoutMs: 180_000,
        onTick,
    });
    return final.job?.result || final.result || final;
}

/* ----------------------------- Field helpers ----------------------------- */

export function textField(value) {
    return { type: "text", text: String(value ?? "") };
}

export function imageField(assetId) {
    if (!assetId) throw new Error("[canva] imageField requires assetId");
    return { type: "image", asset_id: assetId };
}
