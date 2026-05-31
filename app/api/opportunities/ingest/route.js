/**
 * POST /api/opportunities/ingest
 * --------------------------------------------------------------------------
 * Receives the daily Opportunity Intelligence report from n8n (WF-06) and
 * persists it under data/opportunities/. Designed to be paired with
 * GET /api/opportunities/latest so the next day's run can read its own
 * yesterday-snapshot and compute deltas.
 *
 * Request:
 *   POST /api/opportunities/ingest
 *   header: Authorization: Bearer <OPPORTUNITY_INGEST_TOKEN>
 *   body  : <full report object built by WF-06>
 *
 * Response: { ok, date, written: { latest, dated } }
 *
 * Storage notes
 * -------------
 * Vercel's filesystem is read-only at runtime, so we degrade gracefully:
 *   - locally / self-hosted     -> writes data/opportunities/{date}.json + latest.json
 *   - read-only environments    -> returns ok with persisted=false so the
 *                                  upstream caller can decide what to do
 *                                  (typically: also POST to a webhook.site /
 *                                  Slack URL, or commit via the GitHub API).
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { writeDataFiles } from "@/lib/persist/writeData.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getExpectedToken() {
    return (
        process.env.OPPORTUNITY_INGEST_TOKEN ||
        process.env.OPPORTUNITY_API_TOKEN ||
        ""
    );
}

function isAuthorized(req, expected) {
    if (!expected) return false;
    const header = req.headers.get("authorization") || "";
    if (header.toLowerCase().startsWith("bearer ")) {
        return header.slice(7).trim() === expected;
    }
    // Allow x-opportunity-token as a fallback for callers that can't set Auth.
    const fallback = req.headers.get("x-opportunity-token") || "";
    return fallback === expected;
}

export async function POST(req) {
    const expected = getExpectedToken();
    if (!expected) {
        return NextResponse.json(
            { ok: false, error: "ingest_token_not_configured" },
            { status: 500 },
        );
    }
    if (!isAuthorized(req, expected)) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let report;
    try {
        report = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    if (!report || typeof report !== "object") {
        return NextResponse.json({ ok: false, error: "missing_body" }, { status: 400 });
    }

    const date =
        typeof report.date === "string" && ISO_DATE_RE.test(report.date)
            ? report.date
            : new Date().toISOString().slice(0, 10);

    const datedPath = `data/opportunities/${date}.json`;
    const latestPath = `data/opportunities/latest.json`;
    const payload = JSON.stringify(report, null, 2) + "\n";

    const result = await writeDataFiles(
        [
            { path: datedPath, content: payload },
            { path: latestPath, content: payload }
        ],
        { message: `chore(data): opportunity report ${date}` }
    );

    return NextResponse.json({
        ok: true,
        date,
        persisted: result.persisted,
        via: result.via,
        written: { latest: latestPath, dated: datedPath },
        ...(result.pr ? { pr: result.pr } : {}),
        ...(result.error ? { error: result.error, hint: result.hint } : {})
    });
}
