---
inclusion: always
---

# Skills Policy (always-on)

This workspace ships with a curated set of skills under `.kiro/skills/`.
Kiro must follow this policy in **every** session.

## 1. Discovery (automatic, every session)

At the start of each session:

1. Treat `.kiro/skills/` as the source of truth for available skills.
2. For any user request, scan skill names and `SKILL.md` descriptions
   to find the **best matching skill** before answering.
3. When a skill matches, activate it via the `disclose_context` tool
   and follow its instructions verbatim.
4. If multiple skills could apply, briefly tell the user which ones
   you considered and why you picked one.

## 2. Installed skills (sources)

These skills were installed from public GitHub repos. The source repos
are tracked here so they can be pulled for upgrades.

| Source repo | Branch | Skills folder | Count |
|---|---|---|---|
| `https://github.com/anthropics/skills` | `main` | `skills/claude-api` | 1 |
| `https://github.com/zubair-trabzada/geo-seo-claude` | `main` | `skills/` | 15 |
| `https://github.com/coreyhaines31/marketingskills` | `main` | `skills/` | 41 |

When the user adds a new source, append a row to this table and commit
the change in the same PR as the new skills.

## 3. Adding new skills (on user request)

When the user says any of: *"add this skill"*, *"install skill from..."*,
*"jib hadshi skill"*, *"zid liya skill"*, or provides a GitHub URL that
looks like a skill or skill collection:

1. Identify whether the URL is:
   - a **single skill** (folder containing `SKILL.md`), or
   - a **collection** (repo with a `skills/` folder containing many).
2. Clone the source shallowly to a temp location outside the repo
   (e.g. `/projects/skill-sources/<repo>`).
3. Copy each skill folder into `.kiro/skills/<skill-name>/`.
   - If a skill name already exists, ask the user whether to
     **overwrite**, **rename** (suffix the source, e.g. `-v2`),
     or **skip**.
4. Update the source table in section 2.
5. Update `.kiro/skills/README.md` so the new skills are listed.
6. Commit on a branch named `add-skills-<short-source-name>` and push.
7. Clean up the temp clone directory.
8. Report back: number added, names, branch URL.

## 4. Upgrading existing skills (on user request)

When the user says any of: *"upgrade skills"*, *"update skills"*,
*"jib jdid"*, *"sync skills"*, or names a specific source:

1. For each source in the table in section 2:
   - Clone shallowly to a temp location.
   - Run a diff against `.kiro/skills/` for that source's skills.
2. Show the user a **summary diff first** (which skills changed,
   which are new, which were removed upstream) — do not write yet.
3. After confirmation:
   - Overwrite changed skills.
   - Add newly added upstream skills.
   - For skills that were removed upstream, **leave them in place**
     and ask the user separately if they want to delete.
4. Update `.kiro/skills/README.md`.
5. Commit on a branch named `upgrade-skills-<date>` and push.
6. Clean up the temp clone directory.

## 5. Hygiene rules

- **Never** commit `/projects/skill-sources/` or any temp clone — it
  must live outside the workspace, or be `.gitignore`d if temporarily
  inside.
- **Always** preserve the upstream `LICENSE` reference in
  `.kiro/skills/README.md`.
- **Never** edit files inside an individual `<skill>/` folder by hand
  — upgrades come only from the source repo.
- If you make a project-specific tweak to a skill, fork it under a new
  name (e.g. `copywriting-nakazaki`) instead of editing the original.

## 6. What "automatic" means here

- ✅ Discovery and matching of installed skills happens every turn.
- ✅ Following this steering file happens every session.
- ❌ Pulling new skills or upgrading is **not** done without the user
  asking. Kiro is reactive, not autonomous — but once asked, it
  follows the workflow above end-to-end without further prompts.
