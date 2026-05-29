/**
 * GET /api/canva/oauth/callback
 * --------------------------------------------------------------------------
 * Handles Canva's redirect after user consent. Validates the `state`
 * cookie, exchanges the `code` for tokens, stores them via token-store.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/canva/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
        return NextResponse.json(
            { ok: false, error, description: url.searchParams.get("error_description") },
            { status: 400 },
        );
    }
    if (!code) {
        return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
    }

    const verifier = req.cookies.get("canva_pkce_verifier")?.value;
    const expectedState = req.cookies.get("canva_oauth_state")?.value;
    if (!verifier) {
        return NextResponse.json(
            { ok: false, error: "missing_verifier" },
            { status: 400 },
        );
    }
    if (!expectedState || expectedState !== state) {
        return NextResponse.json(
            { ok: false, error: "state_mismatch" },
            { status: 400 },
        );
    }

    try {
        const tokens = await exchangeCodeForTokens({ code, codeVerifier: verifier });
        const res = NextResponse.json({
            ok: true,
            scopes: tokens.scope,
            expires_at: tokens.expires_at,
            message:
                "Canva connected. You can now run `npm run canva:generate` or POST to /api/canva/webhook.",
        });
        // Clear the short-lived cookies.
        res.cookies.delete("canva_pkce_verifier");
        res.cookies.delete("canva_oauth_state");
        return res;
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: err.message, canva: err.canva || null },
            { status: 500 },
        );
    }
}
