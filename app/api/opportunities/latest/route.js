/**
 * GET /api/opportunities/latest
 * --------------------------------------------------------------------------
 * Serves the most recent Opportunity Intelligence report so the next-day
 * n8n run (WF-06) can compute day-over-day deltas.
 *
 * Response shapes:
 *   200 -> the full report JSON (matches what /ingest received)
 *   404 -> {"ok":false,"error":"no_report"}  (first-run case, harmless)
 *
 * No auth: this endpoint is intentionally read-only and returns the same
 * data that already lives in the public repo at data/opportunities/latest.json.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const file = path.join(process.cwd(), "data", "opportunities", "latest.json");
    try {
        const raw = await fs.readFile(file, "utf8");
        return new NextResponse(raw, {
            status: 200,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "public, max-age=300, s-maxage=300",
            },
        });
    } catch (err) {
        if (err && err.code === "ENOENT") {
            return NextResponse.json({ ok: false, error: "no_report" }, { status: 404 });
        }
        return NextResponse.json(
            { ok: false, error: "read_failed", code: err && err.code },
            { status: 500 },
        );
    }
}
