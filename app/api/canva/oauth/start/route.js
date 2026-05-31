/**
 * GET /api/canva/oauth/start
 * --------------------------------------------------------------------------
 * Kick off the Canva Connect OAuth flow. Generates a PKCE pair, stores the
 * verifier + state in short-lived httpOnly cookies, and redirects the user
 * to Canva's consent screen.
 *
 * After approval Canva redirects to /api/canva/oauth/callback.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import {
    buildAuthorizationUrl,
    createPkcePair,
    createState,
} from "@/lib/canva/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const { verifier, challenge } = createPkcePair();
    const state = createState();
    const url = buildAuthorizationUrl({ state, codeChallenge: challenge });

    const res = NextResponse.redirect(url);
    const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/canva/oauth",
        maxAge: 60 * 10, // 10 minutes
    };
    res.cookies.set("canva_pkce_verifier", verifier, cookieOpts);
    res.cookies.set("canva_oauth_state", state, cookieOpts);
    return res;
}
