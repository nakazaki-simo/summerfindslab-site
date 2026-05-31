# Agent memory — `data/memory/`

Long-term, git-tracked memory for the self-feeding loop. Written by
`POST /api/analytics/ingest` after it scores a MetricSnapshot
(`lib/feedback/score.js`).

## Files

- **`learnings.jsonl`** — one JSON object per line, `SCHEMA-Learning`. Each line
  is a "winner" takeaway derived from real performance metrics, e.g. which pin
  formula or article angle earned saves / outbound clicks.

### SCHEMA-Learning (one per line)

```json
{
  "id": "lrn-2026-05-31-pin-013-aesthetic-lifestyle",
  "date": "2026-05-31",
  "refType": "pin",
  "refId": "pin-013-aesthetic-lifestyle",
  "productId": "pro-breeze-pro-breeze-airflo-mini-turbo-003",
  "formulaId": "aesthetic-lifestyle",
  "verdict": "winner",
  "metrics": { "impressions": 4200, "saves": 120, "outboundClicks": 64, "ctr": 0.0152, "saveRate": 0.0286 },
  "lesson": "Pin (aesthetic-lifestyle) \"pin-013-...\" performed well · 64 outbound clicks · 120 saves · 1.52% CTR · formula=aesthetic-lifestyle is worth repeating",
  "tags": ["winner", "pin", "formula:aesthetic-lifestyle", "product:pro-breeze-..."]
}
```

## Rules

- **Only our own content.** refIds are our pin ids / article slugs; productIds are
  ours. No third-party text, no user data, **no PII**.
- **Append-only, git-tracked.** History is the value. Don't rewrite past lines.
- On Vercel (read-only FS) these are written via the GitHub Contents API to an
  `auto/data-<date>` branch + PR (ADR-001). On read-only hosts the append is an
  update-in-place of the committed blob; exact line-append happens on
  local / self-hosted runs and on the next rebuild after the PR merges.
