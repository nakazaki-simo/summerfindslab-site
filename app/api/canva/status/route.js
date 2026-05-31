/**
 * GET /api/canva/status
 * --------------------------------------------------------------------------
 * Quick health check: tells you whether Canva is connected and how long
 * the current access token is still valid for. Safe to expose; returns no
 * secret material.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { loadTokens, isExpired } from "@/lib/canva/token-store";
import { listConfiguredFormulas } from "@/lib/pin-pipeline/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const tokens = await loadTokens();
    const connected = Boolean(tokens?.access_token);
    return NextResponse.json({
        connected,
        expired: connected ? isExpired(tokens) : null,
        expiresAt: tokens?.expires_at ?? null,
        scopes: tokens?.scope ? tokens.scope.split(" ") : [],
        configuredFormulas: listConfiguredFormulas(),
    });
}
