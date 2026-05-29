/**
 * lib/canva/client.js
 * --------------------------------------------------------------------------
 * Thin fetch wrapper around the Canva Connect REST API.
 *
 *  - Auto-attaches the Authorization header from the OAuth token store.
 *  - Auto-refreshes once on 401.
 *  - JSON in / JSON out, surfaces Canva error payloads as thrown Errors.
 *
 * Every higher-level service (assets, brand templates, autofill, exports)
 * uses this client. If you ever need to swap to the official SDK
 * (@canva/connect-api-ts) you only change this file.
 * --------------------------------------------------------------------------
 */

import { getCanvaConfig } from "./config.js";
import { getAccessToken } from "./oauth.js";

const RETRY_ON_STATUS = new Set([429, 500, 502, 503, 504]);

async function doFetch(method, path, { body, headers, query, raw } = {}, accessToken) {
    const cfg = getCanvaConfig();
    const url = new URL(
        path.startsWith("http") ? path : `${cfg.apiBase}${path}`,
    );
    if (query) {
        for (const [k, v] of Object.entries(query)) {
            if (v == null) continue;
            url.searchParams.set(k, String(v));
        }
    }

    const init = {
        method,
        headers: {
            authorization: `Bearer ${accessToken}`,
            accept: "application/json",
            ...(body && !raw ? { "content-type": "application/json" } : {}),
            ...(headers || {}),
        },
    };
    if (body) init.body = raw ? body : JSON.stringify(body);

    const res = await fetch(url, init);
    const ctype = res.headers.get("content-type") || "";
    const payload = ctype.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text();

    return { res, payload };
}

async function request(method, path, opts = {}, attempt = 0) {
    const accessToken = await getAccessToken();
    const { res, payload } = await doFetch(method, path, opts, accessToken);

    if (res.ok) return payload;

    // 401 once -> token might be stale despite expires_at; force a refresh.
    if (res.status === 401 && attempt === 0) {
        return request(method, path, opts, attempt + 1);
    }

    if (RETRY_ON_STATUS.has(res.status) && attempt < 3) {
        const wait = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, wait));
        return request(method, path, opts, attempt + 1);
    }

    const message =
        payload?.message ||
        payload?.error?.message ||
        payload?.error ||
        res.statusText;
    const err = new Error(`[canva ${res.status}] ${method} ${path}: ${message}`);
    err.status = res.status;
    err.canva = payload;
    throw err;
}

export const canva = {
    get: (path, opts) => request("GET", path, opts),
    post: (path, body, opts) => request("POST", path, { ...(opts || {}), body }),
    patch: (path, body, opts) => request("PATCH", path, { ...(opts || {}), body }),
    del: (path, opts) => request("DELETE", path, opts),
};

/**
 * Poll a Canva async job. Most heavy operations (autofill, export) return
 * a `job` object that needs polling until status === "success" or "failed".
 *
 *   pollJob({ url: '/asset-uploads/{id}' })
 *     -> resolves with the final payload, or throws on failure / timeout.
 */
export async function pollJob({
    url,
    intervalMs = 1500,
    timeoutMs = 120_000,
    onTick,
} = {}) {
    if (!url) throw new Error("[canva] pollJob requires a url");
    const started = Date.now();
    let attempt = 0;
    while (true) {
        const data = await canva.get(url);
        attempt += 1;
        const status = data?.job?.status || data?.status;
        onTick?.({ attempt, status, data });
        if (status === "success") return data;
        if (status === "failed") {
            const err = new Error(
                `[canva] job failed: ${data?.job?.error?.message || "unknown"}`,
            );
            err.canva = data;
            throw err;
        }
        if (Date.now() - started > timeoutMs) {
            throw new Error(`[canva] pollJob timeout after ${timeoutMs}ms (${url})`);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}
