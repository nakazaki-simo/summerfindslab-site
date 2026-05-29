/**
 * lib/canva/assets.js
 * --------------------------------------------------------------------------
 * Upload product images into the user's Canva account so they can be
 * referenced from autofill payloads.
 *
 *  - uploadAssetFromUrl(url, name): downloads an Amazon product image,
 *    streams it to Canva's upload endpoint, polls the upload job, returns
 *    { id, thumbnail, name }.
 *  - uploadAssetFromBuffer(buffer, name, mime): same thing for in-memory bytes.
 *
 * Canva Connect upload endpoint:
 *   POST /asset-uploads   (multipart) -> returns job id
 *   GET  /asset-uploads/{job_id}      (poll until status === 'success')
 *
 * Reference: https://www.canva.dev/docs/connect/api-reference/assets/
 * --------------------------------------------------------------------------
 */

import { canva, pollJob } from "./client.js";
import { getAccessToken } from "./oauth.js";
import { getCanvaConfig } from "./config.js";

async function fetchBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`[canva] fetch image failed ${res.status}: ${url}`);
    }
    const ab = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || "image/jpeg";
    return { buffer: Buffer.from(ab), mime };
}

export async function uploadAssetFromBuffer(buffer, name, mime = "image/jpeg") {
    const cfg = getCanvaConfig();
    const accessToken = await getAccessToken();

    // Canva expects metadata in a header (base64-encoded JSON) and the raw
    // bytes as the body. This keeps the request lightweight (no multipart).
    const metaHeader = Buffer.from(
        JSON.stringify({ name_base64: Buffer.from(name).toString("base64") }),
    ).toString("base64");

    const res = await fetch(`${cfg.apiBase}/asset-uploads`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${accessToken}`,
            "asset-upload-metadata": metaHeader,
            "content-type": mime,
        },
        body: buffer,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(
            `[canva ${res.status}] asset-upload: ${json?.message || res.statusText}`,
        );
        err.canva = json;
        throw err;
    }
    const jobId = json?.job?.id;
    if (!jobId) throw new Error("[canva] asset-upload returned no job id");

    const final = await pollJob({ url: `/asset-uploads/${jobId}` });
    return final.asset; // { id, name, thumbnail, ... }
}

export async function uploadAssetFromUrl(url, name) {
    const { buffer, mime } = await fetchBuffer(url);
    return uploadAssetFromBuffer(buffer, name, mime);
}

export async function getAsset(assetId) {
    return canva.get(`/assets/${assetId}`);
}
