#!/usr/bin/env node
/**
 * scripts/canva/test-auth.mjs
 * --------------------------------------------------------------------------
 * Verify the OAuth connection. Reads the stored token, refreshes if needed,
 * and pings GET /users/me. Use this right after running the OAuth flow.
 *
 * Usage:
 *   npm run canva:test-auth
 * --------------------------------------------------------------------------
 */

import { loadEnv, pretty } from "./_shared.mjs";
loadEnv();

const { canva } = await import("../../lib/canva/client.js");
const { loadTokens } = await import("../../lib/canva/token-store.js");

const tokens = await loadTokens();
if (!tokens) {
    console.error(
        "[canva] No tokens stored. Start the dev server then visit /api/canva/oauth/start",
    );
    process.exit(1);
}

try {
    const me = await canva.get("/users/me");
    console.log("[canva] Connected ✓");
    console.log(pretty(me));
} catch (err) {
    console.error("[canva] Auth check failed:", err.message);
    if (err.canva) console.error(pretty(err.canva));
    process.exit(1);
}
