/**
 * lib/feedback/score.js
 * --------------------------------------------------------------------------
 * Turns a MetricSnapshot into per-item verdicts (winner | neutral | rejected)
 * and the derived learning + training records that close the analytics ->
 * learning loop.
 *
 * NOTE ON SCHEMAS: the task referenced docs/AGENT-SYSTEM.md (§6
 * SCHEMA-MetricSnapshot / SCHEMA-Learning), which does not exist in this repo.
 * The shapes below are defined here as the canonical contract for this feature
 * and are documented in data/memory/README.md. If the doc is added later, keep
 * this file as the source of truth and reference it from the doc.
 *
 * SCHEMA-MetricSnapshot (input)
 * -----------------------------
 * {
 *   date: "YYYY-MM-DD",
 *   source: "pinterest" | "ga4" | "plausible" | "manual" | string,
 *   items: [
 *     {
 *       refType: "pin" | "article",
 *       refId: string,                 // our pin id or article/guide slug
 *       productId?: string,            // optional link back to a product
 *       formulaId?: string,            // for pins
 *       url?: string,                  // destination/canonical (our content)
 *       impressions?: number,
 *       saves?: number,                // Pinterest saves (a.k.a repins)
 *       outboundClicks?: number,       // clicks to Amazon / our outbound
 *       ctr?: number                   // 0..1; derived if absent
 *     }
 *   ]
 * }
 *
 * SCHEMA-Learning (one per winner, appended to data/memory/learnings.jsonl)
 * ------------------------------------------------------------------------
 * {
 *   id, date, refType, refId, productId?, formulaId?, verdict: "winner",
 *   metrics: { impressions, saves, outboundClicks, ctr, saveRate },
 *   lesson: string,                    // short, human-readable takeaway
 *   tags: string[]
 * }
 * --------------------------------------------------------------------------
 */

/** Default thresholds. Conservative for a cold-start account; tune later. */
export const DEFAULT_THRESHOLDS = {
    winner: { minOutboundClicks: 5, minSaves: 10, minCtr: 0.01 },
    rejected: { maxCtr: 0.002, minImpressions: 200 } // lots of views, ~no clicks
};

function num(v) {
    return typeof v === "number" && isFinite(v) ? v : 0;
}

/** Derive ctr + saveRate if not provided. ctr = outboundClicks / impressions. */
export function deriveRates(item) {
    const impressions = num(item.impressions);
    const saves = num(item.saves);
    const outboundClicks = num(item.outboundClicks);
    const ctr =
        typeof item.ctr === "number" && isFinite(item.ctr)
            ? item.ctr
            : impressions > 0
                ? outboundClicks / impressions
                : 0;
    const saveRate = impressions > 0 ? saves / impressions : 0;
    return { impressions, saves, outboundClicks, ctr, saveRate };
}

/**
 * Classify a single item. A "winner" clears any of the winner signals AND has
 * real engagement; a "rejected" item has meaningful reach but ~no clicks;
 * everything else is "neutral".
 */
export function classifyItem(item, thresholds = DEFAULT_THRESHOLDS) {
    const m = deriveRates(item);
    const w = thresholds.winner;
    const r = thresholds.rejected;

    const isWinner =
        m.outboundClicks >= w.minOutboundClicks ||
        (m.saves >= w.minSaves && m.ctr >= w.minCtr);

    if (isWinner) return { verdict: "winner", metrics: m };

    const isRejected = m.impressions >= r.minImpressions && m.ctr <= r.maxCtr;
    if (isRejected) return { verdict: "rejected", metrics: m };

    return { verdict: "neutral", metrics: m };
}

function shortId(refId, date) {
    return `lrn-${date}-${String(refId).slice(0, 48)}`;
}

/** Build a human-readable lesson string from the metrics. */
function lessonFor(item, m) {
    const what = item.refType === "pin" ? `Pin (${item.formulaId || "formula"})` : "Article";
    const bits = [
        `${what} "${item.refId}" performed well`,
        `${m.outboundClicks} outbound clicks`,
        `${m.saves} saves`,
        `${(m.ctr * 100).toFixed(2)}% CTR`
    ];
    if (item.formulaId) bits.push(`formula=${item.formulaId} is worth repeating`);
    return bits.join(" · ");
}

/**
 * Build a SCHEMA-Learning record for a winner.
 */
export function toLearning(item, m, date) {
    const tags = ["winner", item.refType].filter(Boolean);
    if (item.formulaId) tags.push(`formula:${item.formulaId}`);
    if (item.productId) tags.push(`product:${item.productId}`);
    return {
        id: shortId(item.refId, date),
        date,
        refType: item.refType,
        refId: item.refId,
        productId: item.productId || null,
        formulaId: item.formulaId || null,
        verdict: "winner",
        metrics: {
            impressions: m.impressions,
            saves: m.saves,
            outboundClicks: m.outboundClicks,
            ctr: Number(m.ctr.toFixed(4)),
            saveRate: Number(m.saveRate.toFixed(4))
        },
        lesson: lessonFor(item, m),
        tags
    };
}

/**
 * Build an Unsloth-style training example from a winner. Only our own content
 * is used (refId/formula/product are ours; no third-party text, no PII).
 *
 * Shape: { task, input, output, outcome, quality }
 */
export function toTrainingExample(item, m, date) {
    const task =
        item.refType === "pin"
            ? "generate_pinterest_pin_hook"
            : "write_affiliate_article_angle";
    const input = {
        refType: item.refType,
        productId: item.productId || null,
        formulaId: item.formulaId || null,
        category: item.category || null
    };
    const output = {
        refId: item.refId,
        url: item.url || null
    };
    // quality 0..1 — blend of CTR and save rate, capped.
    const quality = Math.min(1, m.ctr * 20 + m.saveRate * 5);
    return {
        task,
        input,
        output,
        outcome: {
            date,
            impressions: m.impressions,
            saves: m.saves,
            outboundClicks: m.outboundClicks,
            ctr: Number(m.ctr.toFixed(4))
        },
        quality: Number(quality.toFixed(3))
    };
}

/**
 * Score a whole MetricSnapshot.
 * @returns {{
 *   date: string,
 *   counts: {winner:number, neutral:number, rejected:number},
 *   verdicts: Array<{refId, refType, verdict, metrics}>,
 *   learnings: object[],
 *   trainingExamples: object[]
 * }}
 */
export function scoreSnapshot(snapshot, thresholds = DEFAULT_THRESHOLDS) {
    const date =
        typeof snapshot?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(snapshot.date)
            ? snapshot.date
            : new Date().toISOString().slice(0, 10);

    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    const counts = { winner: 0, neutral: 0, rejected: 0 };
    const verdicts = [];
    const learnings = [];
    const trainingExamples = [];

    for (const item of items) {
        if (!item || !item.refId || !item.refType) continue;
        const { verdict, metrics } = classifyItem(item, thresholds);
        counts[verdict] = (counts[verdict] || 0) + 1;
        verdicts.push({ refId: item.refId, refType: item.refType, verdict, metrics });
        if (verdict === "winner") {
            learnings.push(toLearning(item, metrics, date));
            trainingExamples.push(toTrainingExample(item, metrics, date));
        }
    }

    return { date, counts, verdicts, learnings, trainingExamples };
}
