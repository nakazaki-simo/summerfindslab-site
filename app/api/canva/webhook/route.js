/**
 * POST /api/canva/webhook
 * --------------------------------------------------------------------------
 * Trigger pin generation programmatically. Designed for n8n / cron / GitHub
 * Actions to call once new products land in data/products.json.
 *
 * Request:
 *   POST /api/canva/webhook
 *   header: x-canva-pipeline-secret: <CANVA_WEBHOOK_SECRET>
 *   body  : { "filter": { "formulaId": "price-tag-find", "kind": "product", "limit": 5 } }
 *
 * Response: { attempted, succeeded, skipped, errored, results }
 *
 * Why a separate webhook secret?
 *   The Canva OAuth tokens belong to the studio user. The webhook secret
 *   authorises automation to *use* that connection. They rotate independently.
 * --------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getCanvaConfig } from "@/lib/canva/config";
import { generatePins } from "@/lib/pin-pipeline/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // pin generation can take a while

async function readJson(p) {
    return JSON.parse(await fs.readFile(p, "utf8"));
}

export async function POST(req) {
    const cfg = getCanvaConfig();
    if (!cfg.webhookSecret) {
        return NextResponse.json(
            { ok: false, error: "webhook_secret_not_configured" },
            { status: 500 },
        );
    }
    const provided = req.headers.get("x-canva-pipeline-secret") || "";
    if (provided !== cfg.webhookSecret) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }
    const filter = body.filter || {};

    const root = process.cwd();
    const pins = await readJson(path.join(root, "data", "pinterest-pins.json"));
    const products = await readJson(path.join(root, "data", "products.json"));

    try {
        const summary = await generatePins({ pins, products, filter });
        return NextResponse.json({ ok: true, ...summary });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: err.message, canva: err.canva || null },
            { status: 500 },
        );
    }
}
