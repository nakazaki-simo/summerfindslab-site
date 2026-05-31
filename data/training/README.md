# Training data — `data/training/`

Fine-tuning dataset for a future Unsloth run. Written by
`POST /api/analytics/ingest` from "winner" items in a scored MetricSnapshot
(`lib/feedback/score.js`).

## Files

- **`examples.jsonl`** — one JSON object per line in the Unsloth-friendly shape
  `{ task, input, output, outcome, quality }`.

### Example line

```json
{
  "task": "generate_pinterest_pin_hook",
  "input": { "refType": "pin", "productId": "pro-breeze-...", "formulaId": "aesthetic-lifestyle", "category": null },
  "output": { "refId": "pin-013-aesthetic-lifestyle", "url": null },
  "outcome": { "date": "2026-05-31", "impressions": 4200, "saves": 120, "outboundClicks": 64, "ctr": 0.0152 },
  "quality": 0.447
}
```

- `task` — what the model should learn to produce (`generate_pinterest_pin_hook`
  for pins, `write_affiliate_article_angle` for articles).
- `input` — the conditioning context (all our own metadata).
- `output` — a pointer to the winning artifact we produced.
- `outcome` — the measured result that justified keeping it.
- `quality` — 0..1 score blended from CTR + save rate (used to weight/filter).

## Rules

- **Only our own content.** No third-party copy, no scraped text, **no PII**.
- Only **winners** are written, so the dataset is positively-biased by design;
  the `quality` field lets a training run threshold or weight examples.
- Append-only and git-tracked (same write-back path as `data/memory/`).
