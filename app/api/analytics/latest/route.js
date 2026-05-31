/**
 * GET /api/analytics/latest
 * --------------------------------------------------------------------------
 * Public read of the most recent analytics MetricSnapshot, so WF-05 (or a
 * dashboard) can compute day-over-day deltas. Mirrors
 * GET /api/opportunities/latest.
 *
 * Response shapes:
 *   200 -> the full snapshot JSON (matches what /ingest received)
 *   404 -> {"ok":false,"error":"no_snapshot"} (first-run case, harmless)
 *
 * No auth: the only data here is aggregate metrics about our own content.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const file = path.join(process.cwd(), "data", "analytics", "latest.json");
    try {
        const raw = await fs.readFile(file, "utf8");
        return new NextResponse(raw, {
            status: 200,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "public, max-age=300, s-maxage=300"
            }
        });
    } catch (err) {
        if (err && err.code === "ENOENT") {
            return NextResponse.json({ ok: false, error: "no_snapshot" }, { status: 404 });
        }
        return NextResponse.json(
            { ok: false, error: "read_failed", code: err && err.code },
            { status: 500 }
        );
    }
}
