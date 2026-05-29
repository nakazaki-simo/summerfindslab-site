/**
 * lib/canva/token-store.js
 * --------------------------------------------------------------------------
 * File-based persistence for Canva OAuth tokens.
 *
 * Why a JSON file?
 *  - Beginner-friendly: no Redis / DB to set up.
 *  - Adequate for single-user / agency-bot usage on one machine.
 *  - Trivial to swap later: only `loadTokens` and `saveTokens` are exported.
 *
 * The file path is controlled by `CANVA_TOKEN_STORE` (default: data/canva/tokens.json)
 * and is gitignored. To migrate to Postgres / Supabase, replace this module's
 * two functions and keep the same shape:
 *
 *   { access_token, refresh_token, expires_at, token_type, scope }
 * --------------------------------------------------------------------------
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getCanvaConfig } from "./config.js";

function resolveStorePath() {
    const cfg = getCanvaConfig();
    return path.resolve(process.cwd(), cfg.tokenStore);
}

export async function loadTokens() {
    const file = resolveStorePath();
    try {
        const raw = await fs.readFile(file, "utf8");
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
    }
}

export async function saveTokens(tokens) {
    const file = resolveStorePath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    // expires_at = absolute ms timestamp; easier than tracking expires_in deltas.
    const payload = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || "Bearer",
        scope: tokens.scope || "",
        expires_at: tokens.expires_at || Date.now() + (tokens.expires_in || 0) * 1000,
    };
    await fs.writeFile(file, JSON.stringify(payload, null, 2), { mode: 0o600 });
    return payload;
}

export async function clearTokens() {
    const file = resolveStorePath();
    try {
        await fs.unlink(file);
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
}

export function isExpired(tokens, skewMs = 60_000) {
    if (!tokens?.expires_at) return true;
    return Date.now() + skewMs >= tokens.expires_at;
}
