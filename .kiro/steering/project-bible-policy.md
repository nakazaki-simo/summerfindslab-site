# Project Bible Auto-Update Policy (always-on)

`PROJECT_BIBLE.md` (repo root) is the canonical source of truth for this project.
Kiro MUST keep it current automatically. This policy runs in **every** session.

## 1. The rule

After completing **any** task that changes the project — code, data, config,
workflows, content, docs, skills, infrastructure, decisions — Kiro updates
`PROJECT_BIBLE.md` in the **same turn**, before reporting the task as done.

"Task" = any unit of work the owner asked for that altered the repo or a
decision about it. Pure questions, read-only investigation, or chat that changes
nothing do **not** require a bible update.

## 2. What to update (match the change to the section)

Pick only the sections the change actually touches — do not rewrite the whole file:

- **Always:** bump the top version line (`Document version: vX.Y`) and the
  `Last updated:` date, and add one concise entry to the **Changelog** section
  at the bottom.
  - MAJOR (vX) = architecture / ADR / tech-stack / data-model change.
  - MINOR (vX.Y) = task completion, content, data, workflow, or doc change.
- **§7 ADRs** — when a decision is made, changed, or resolved: flip its Status
  and edit the record (add a new ADR for genuinely new decisions).
- **§8 Current State Snapshot** — move items between ✓ DONE / 🟡 IN PROGRESS /
  ● BROKEN / ▪ NOT STARTED; refresh "Last commands / state seen".
- **§9 Task Queue** — mark tasks done (✅), add new tasks, or re-prioritize.
- **§11 Failure Log** — add a row whenever a bug is found+fixed (root cause →
  fix → prevention) so the next AI doesn't re-trigger it.
- **§3 Tech Stack / §5 Data Model / §4 Architecture** — only when those actually
  change (new dep, new entity/field, new module or route, new integration).
- Other sections (§2 roadmap, §10 patterns, §12 env, §14 risks) — update when
  the change affects them.

## 3. Style rules for edits

- English only (docs/code/commits rule from `skills-policy.md` and the bible's
  §0 communication style).
- Concise. Prefer editing an existing line over adding new prose.
- "Code wins on conflicts" — if the file disagrees with reality, fix the file to
  match the code/state, then note it.
- Keep the §15 Self-Validation checklist answerable at all times.
- Use `str_replace` for targeted edits; never blindly overwrite the whole file.

## 4. Changelog entry format

Add to the `## Changelog` list, newest first:

```
- **vX.Y (YYYY-MM-DD)** — <what changed + why, one or two lines>. <branch/PR if any>.
```

## 5. Confirm-gates still apply

This policy never overrides the autonomy / "ask first" rules in the bible's §0
or `skills-policy.md`. Updating the bible is a safe local edit and is always
allowed; the underlying task may still require confirmation.
