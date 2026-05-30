/**
 * /api/pinterest/published
 * --------------------------------------------------------------------------
 * Idempotency log for the Pinterest Publisher (WF-04) workflow.
 *
 * GET  /api/pinterest/published
 *   Returns the array of already-published pin records so the workflow can
 *   skip them on the next run. Public read (no auth) — the only data here is
 *   pin ids that already exist on a public Pinterest profile anyway.
 *
 * POST /api/pinterest/published
 *   header: Authorization: Bearer <PINTEREST_INGEST_TOKEN>
 *   body  : { pinId, pinterestPinId, boardId, publishedAt, published, error? }
 *
 *   Appends one record. Idempotent on `pinId` — re-posting the same pinId
 *   replaces the existing entry instead of duplicating it.
 *
 * Storage
 * -------
 * Writes to `data/pinterest-published.json` when the filesystem is writable
 * (local dev, self-hosted). On read-only hosts (Vercel) it returns 200 with
 * `persisted: false` so the workflow knows the call was accepted but the log
 * needs to be wired to GitHub Contents API or KV later.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "data", "pinterest-published.json");

function getExpectedToken() {
    return (
        process.env.PINTEREST_INGEST_TOKEN ||
        process.env.PINTEREST_API_TOKEN ||
        ""
    );
}

function isAuthorized(req, expected) {
    if (!expected) return false;
    const header = req.headers.get("authorization") || "";
    if (header.toLowerCase().startsWith("bearer ")) {
        return header.slice(7).trim() === expected;
    }
    const fallback = req.headers.get("x-pinterest-token") || "";
    return fallback === expected;
}

async function readLog() {
    try {
        const txt = await fs.readFile(FILE, "utf8");
        const parsed = JSON.parse(txt);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        if (err && err.code === "ENOENT") return [];
        return [];
    }
}

export async function GET() {
    const log = await readLog();
    return NextResponse.json(log, {
        headers: { "Cache-Control": "no-store" },
    });
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

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || !body.pinId) {
        return NextResponse.json({ ok: false, error: "missing_pinId" }, { status: 400 });
    }

    const record = {
        pinId: String(body.pinId),
        pinterestPinId: body.pinterestPinId || null,
        boardId: body.boardId || null,
        publishedAt: body.publishedAt || new Date().toISOString(),
        published: body.published !== false,
        error: body.error || null,
    };

    const existing = await readLog();
    const next = existing.filter((r) => r && r.pinId !== record.pinId);
    next.push(record);

    try {
        await fs.mkdir(path.dirname(FILE), { recursive: true });
        await fs.writeFile(FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
        return NextResponse.json({
            ok: true,
            persisted: true,
            count: next.length,
            record,
        });
    } catch (err) {
        return NextResponse.json({
            ok: true,
            persisted: false,
            error: err && err.code ? err.code : "write_failed",
            count: next.length,
            record,
            hint: "Filesystem is read-only on this host. Wire up GitHub Contents API or Vercel KV in this route to persist long-term.",
        });
    }
}
