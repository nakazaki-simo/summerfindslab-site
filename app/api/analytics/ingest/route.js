/**
 * POST /api/analytics/ingest
 * --------------------------------------------------------------------------
 * Receives a SCHEMA-MetricSnapshot (see lib/feedback/score.js) from the
 * analytics collector (n8n WF-05) and:
 *   1. persists it to data/analytics/<date>.json + data/analytics/latest.json
 *   2. scores it (lib/feedback/score.js) into winner/neutral/rejected
 *   3. appends winners to data/memory/learnings.jsonl (SCHEMA-Learning)
 *      and data/training/examples.jsonl (Unsloth dataset)
 *
 * All writes go through lib/persist/writeData.js, so they persist on the local
 * FS in dev / self-hosted and via the GitHub Contents API (ADR-001) on Vercel's
 * read-only FS — degrading to persisted:false if neither is available.
 *
 * Request:
 *   POST /api/analytics/ingest
 *   header: Authorization: Bearer <ANALYTICS_INGEST_TOKEN>
 *   body  : SCHEMA-MetricSnapshot
 *
 * Response: { ok, date, persisted, via, counts, written, learnings, trainingExamples, pr? }
 *
 * Only our own content is referenced (pin ids, article slugs, product ids).
 * No PII is accepted or stored.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { writeDataFiles, appendJsonl } from "@/lib/persist/writeData.js";
import { scoreSnapshot } from "@/lib/feedback/score.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getExpectedToken() {
    return process.env.ANALYTICS_INGEST_TOKEN || process.env.ANALYTICS_API_TOKEN || "";
}

function isAuthorized(req, expected) {
    if (!expected) return false;
    const header = req.headers.get("authorization") || "";
    if (header.toLowerCase().startsWith("bearer ")) {
        return header.slice(7).trim() === expected;
    }
    const fallback = req.headers.get("x-analytics-token") || "";
    return fallback === expected;
}

export async function POST(req) {
    const expected = getExpectedToken();
    if (!expected) {
        return NextResponse.json(
            { ok: false, error: "ingest_token_not_configured" },
            { status: 500 }
        );
    }
    if (!isAuthorized(req, expected)) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let snapshot;
    try {
        snapshot = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.items)) {
        return NextResponse.json(
            { ok: false, error: "invalid_metric_snapshot", hint: "expected { date, source, items: [...] }" },
            { status: 400 }
        );
    }

    const date =
        typeof snapshot.date === "string" && ISO_DATE_RE.test(snapshot.date)
            ? snapshot.date
            : new Date().toISOString().slice(0, 10);
    snapshot.date = date;

    // 1. Persist the raw snapshot (dated + latest).
    const payload = JSON.stringify(snapshot, null, 2) + "\n";
    const snapWrite = await writeDataFiles(
        [
            { path: `data/analytics/${date}.json`, content: payload },
            { path: `data/analytics/latest.json`, content: payload }
        ],
        { message: `chore(data): analytics snapshot ${date}`, date }
    );

    // 2. Score -> learnings + training examples.
    const scored = scoreSnapshot(snapshot);

    // 3. Append winners to memory + training logs (one line each).
    let learningsWritten = 0;
    let trainingWritten = 0;
    for (const learning of scored.learnings) {
        const r = await appendJsonl("data/memory/learnings.jsonl", learning, {
            message: `chore(memory): learning ${learning.id}`,
            date
        });
        if (r.persisted) learningsWritten++;
    }
    for (const ex of scored.trainingExamples) {
        const r = await appendJsonl("data/training/examples.jsonl", ex, {
            message: `chore(training): example ${date}`,
            date
        });
        if (r.persisted) trainingWritten++;
    }

    return NextResponse.json({
        ok: true,
        date,
        persisted: snapWrite.persisted,
        via: snapWrite.via,
        counts: scored.counts,
        written: {
            snapshot: [`data/analytics/${date}.json`, "data/analytics/latest.json"],
            learnings: scored.learnings.length,
            learningsPersisted: learningsWritten,
            trainingExamples: scored.trainingExamples.length,
            trainingPersisted: trainingWritten
        },
        ...(snapWrite.pr ? { pr: snapWrite.pr } : {}),
        ...(snapWrite.error ? { error: snapWrite.error, hint: snapWrite.hint } : {})
    });
}
