/**
 * lib/canva/oauth.js
 * --------------------------------------------------------------------------
 * Canva Connect OAuth 2.0 with PKCE.
 *
 * Flow:
 *   1. buildAuthorizationUrl() -> redirect user to Canva consent screen
 *   2. user approves -> Canva redirects to /api/canva/oauth/callback?code=...
 *   3. exchangeCodeForTokens(code, codeVerifier) -> save tokens
 *   4. getAccessToken() -> fresh token, auto-refreshes when near expiry
 *
 * Reference docs:
 *   https://www.canva.dev/docs/connect/authentication/
 * --------------------------------------------------------------------------
 */

import crypto from "node:crypto";
import { assertCanvaCredentials, getCanvaConfig } from "./config.js";
import { loadTokens, saveTokens, isExpired } from "./token-store.js";

/* ----------------------------- PKCE helpers ----------------------------- */

function base64url(buf) {
    return buf
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

export function createPkcePair() {
    const verifier = base64url(crypto.randomBytes(64));
    const challenge = base64url(
        crypto.createHash("sha256").update(verifier).digest(),
    );
    return { verifier, challenge };
}

export function createState() {
    return base64url(crypto.randomBytes(24));
}

/* ----------------------------- Auth URL ----------------------------- */

export function buildAuthorizationUrl({ state, codeChallenge } = {}) {
    const cfg = getCanvaConfig();
    assertCanvaCredentials(cfg);

    const params = new URLSearchParams({
        response_type: "code",
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        scope: cfg.scopes.join(" "),
        code_challenge_method: "s256",
        code_challenge: codeChallenge,
        state: state,
    });
    return `${cfg.authBase}/authorize?${params.toString()}`;
}

/* ----------------------------- Token exchange ----------------------------- */

async function postTokenEndpoint(body) {
    const cfg = getCanvaConfig();
    const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString(
        "base64",
    );
    const res = await fetch(`${cfg.authBase}/token`, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            authorization: `Basic ${basic}`,
            accept: "application/json",
        },
        body,
    });
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch {
        json = { raw: text };
    }
    if (!res.ok) {
        const reason = json.error_description || json.error || res.statusText;
        const err = new Error(`[canva] token endpoint ${res.status}: ${reason}`);
        err.canva = json;
        throw err;
    }
    return json;
}

export async function exchangeCodeForTokens({ code, codeVerifier }) {
    const cfg = getCanvaConfig();
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri: cfg.redirectUri,
    });
    const tokens = await postTokenEndpoint(body);
    return saveTokens(tokens);
}

export async function refreshAccessToken(refreshToken) {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });
    const tokens = await postTokenEndpoint(body);
    // Canva sometimes omits refresh_token on refresh — keep the previous one.
    if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
    return saveTokens(tokens);
}

/**
 * High-level helper used by every API call. Returns a valid access_token,
 * refreshing transparently if needed. Throws if no tokens are stored
 * (caller must run the OAuth flow first).
 */
export async function getAccessToken() {
    const stored = await loadTokens();
    if (!stored?.access_token) {
        throw new Error(
            "[canva] No tokens stored. Visit /api/canva/oauth/start to connect Canva.",
        );
    }
    if (!isExpired(stored)) return stored.access_token;

    if (!stored.refresh_token) {
        throw new Error(
            "[canva] Access token expired and no refresh_token available. Re-connect via /api/canva/oauth/start.",
        );
    }
    const refreshed = await refreshAccessToken(stored.refresh_token);
    return refreshed.access_token;
}
