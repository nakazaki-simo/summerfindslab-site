/**
 * lib/persist/writeData.js
 * --------------------------------------------------------------------------
 * One helper every ingest route uses to persist JSON files. It preserves the
 * project's graceful-degradation contract (ADR-001, §11 #1) while adding the
 * durable GitHub Contents API write-back:
 *
 *   1. Try a local `fs.writeFile` (works in dev / self-hosted).
 *   2. If that throws (Vercel read-only FS), fall back to committing the files
 *      to `auto/data-<date>` + opening a PR via lib/persist/githubCommit.js.
 *   3. If neither works (e.g. no GITHUB_DATA_TOKEN), return persisted:false so
 *      the caller still answers 200 and the upstream automation can decide.
 *
 * Returns a structured result describing exactly how the write resolved so the
 * route can echo it back: { ok, persisted, via, files, pr?, error? }.
 * --------------------------------------------------------------------------
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { commitDataFiles, isConfigured as ghConfigured } from "./githubCommit.js";

/**
 * @param {Array<{path:string, content:string}>} files
 *   `path` is repo-relative (e.g. "data/analytics/2026-05-31.json"),
 *   `content` is the UTF-8 string to write (caller adds any trailing newline).
 * @param {Object} [opts]
 * @param {string} [opts.message] commit message for the write-back path
 * @param {string} [opts.date] YYYY-MM-DD for the auto branch name
 */
export async function writeDataFiles(files, opts = {}) {
    if (!Array.isArray(files) || files.length === 0) {
        return { ok: false, persisted: false, via: "none", error: "no_files" };
    }

    // 1. Local filesystem.
    try {
        for (const f of files) {
            const abs = path.join(process.cwd(), f.path);
            await fs.mkdir(path.dirname(abs), { recursive: true });
            await fs.writeFile(abs, f.content, "utf8");
        }
        return {
            ok: true,
            persisted: true,
            via: "fs",
            files: files.map((f) => f.path)
        };
    } catch (fsErr) {
        // 2. Read-only FS -> GitHub write-back, if configured.
        if (!ghConfigured()) {
            return {
                ok: true,
                persisted: false,
                via: "none",
                files: files.map((f) => f.path),
                error: fsErr && fsErr.code ? fsErr.code : "fs_write_failed",
                hint:
                    "Local FS is read-only and GITHUB_DATA_TOKEN/GITHUB_DATA_REPO are not set. " +
                    "Set them to enable durable GitHub Contents API write-back (ADR-001)."
            };
        }
        const result = await commitDataFiles({
            files,
            message: opts.message,
            date: opts.date
        });
        if (result.ok) {
            return {
                ok: true,
                persisted: true,
                via: "github",
                files: files.map((f) => f.path),
                branch: result.branch,
                pr: result.pr,
                commit: result.commit
            };
        }
        return {
            ok: true,
            persisted: false,
            via: "github",
            files: files.map((f) => f.path),
            error: result.error,
            hint: "GitHub write-back failed; check GITHUB_DATA_TOKEN scope (contents+pull_requests) and GITHUB_DATA_REPO."
        };
    }
}

/**
 * Append one JSON object as a line to a `.jsonl` file (memory / training logs).
 * Reads the current file (local FS) when possible so existing lines are kept,
 * then writes the combined content through `writeDataFiles` (FS or GitHub).
 */
export async function appendJsonl(repoRelPath, record, opts = {}) {
    let existing = "";
    try {
        const abs = path.join(process.cwd(), repoRelPath);
        existing = await fs.readFile(abs, "utf8");
    } catch {
        // GitHub-only environments can't cheaply read the current file here;
        // the write-back commit will update-in-place using the blob SHA, but it
        // will overwrite rather than append. For append-mostly logs this is an
        // accepted limitation until a read-through cache exists (documented in
        // data/memory/README.md). Locally and self-hosted, append is exact.
        existing = "";
    }
    const line = JSON.stringify(record);
    const next = existing && !existing.endsWith("\n") ? existing + "\n" + line + "\n" : existing + line + "\n";
    return writeDataFiles([{ path: repoRelPath, content: next }], opts);
}
