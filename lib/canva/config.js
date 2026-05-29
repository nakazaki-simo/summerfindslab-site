/**
 * lib/canva/config.js
 * --------------------------------------------------------------------------
 * Single source of truth for Canva Connect API configuration.
 *
 * Reads from process.env so the same module works in:
 *  - Next.js route handlers (server components, /api routes)
 *  - Plain Node scripts (scripts/canva/*.mjs) when invoked with `node --env-file`
 *    or via `npm run` after a `.env` is loaded by the script entry.
 *
 * NOTE: Never hard-code secrets here. Everything secret-shaped pulls from env.
 * --------------------------------------------------------------------------
 */

const DEFAULTS = {
    apiBase: "https://api.canva.com/rest/v1",
    authBase: "https://www.canva.com/api/oauth",
    tokenStore: "./data/canva/tokens.json",
    exportLog: "./data/canva/exports.json",
    batchSize: 10,
    batchDelayMs: 400,
};

/**
 * Scopes the pin pipeline needs. Configure these when registering the
 * integration in the Canva developer dashboard. Keep the list minimal —
 * Canva will reject the OAuth flow if a scope isn't pre-approved.
 *
 * Reference: https://www.canva.dev/docs/connect/scopes/
 */
export const REQUIRED_SCOPES = [
    "asset:read",
    "asset:write",
    "brandtemplate:meta:read",
    "brandtemplate:content:read",
    "design:meta:read",
    "design:content:read",
    "design:content:write",
];

export function getCanvaConfig() {
    const cfg = {
        clientId: process.env.CANVA_CLIENT_ID || "",
        clientSecret: process.env.CANVA_CLIENT_SECRET || "",
        redirectUri:
            process.env.CANVA_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/canva/oauth/callback`,
        apiBase: process.env.CANVA_API_BASE || DEFAULTS.apiBase,
        authBase: process.env.CANVA_AUTH_BASE || DEFAULTS.authBase,
        tokenStore: process.env.CANVA_TOKEN_STORE || DEFAULTS.tokenStore,
        exportLog: process.env.CANVA_EXPORT_LOG || DEFAULTS.exportLog,
        batchSize: Number(process.env.CANVA_BATCH_SIZE || DEFAULTS.batchSize),
        batchDelayMs: Number(process.env.CANVA_BATCH_DELAY_MS || DEFAULTS.batchDelayMs),
        webhookSecret: process.env.CANVA_WEBHOOK_SECRET || "",
        scopes: REQUIRED_SCOPES,
    };
    return cfg;
}

/**
 * Throw a clear error early when env is missing — the pipeline is useless
 * without OAuth credentials.
 */
export function assertCanvaCredentials(cfg = getCanvaConfig()) {
    const missing = [];
    if (!cfg.clientId) missing.push("CANVA_CLIENT_ID");
    if (!cfg.clientSecret) missing.push("CANVA_CLIENT_SECRET");
    if (!cfg.redirectUri) missing.push("CANVA_REDIRECT_URI");
    if (missing.length) {
        throw new Error(
            `[canva] Missing env vars: ${missing.join(", ")}. ` +
            `Copy .env.example to .env.local and fill them in. ` +
            `See docs/CANVA_INTEGRATION.md for setup.`,
        );
    }
}
