/**
 * lib/persist/githubCommit.js
 * --------------------------------------------------------------------------
 * Durable write-back for `data/*.json` via the GitHub Contents API (ADR-001).
 *
 * Vercel's runtime filesystem is read-only, so ingest routes can't persist
 * with `fs.writeFile`. Instead we commit the JSON to a dedicated branch
 * (`auto/data-<date>`) and open a PR against the default branch. Merging the
 * PR triggers a Vercel rebuild, keeping git as the single source of truth and
 * honoring "never push to main, always PR".
 *
 * Idempotent by design:
 *   - the daily branch is created once, then reused (subsequent calls commit
 *     onto it);
 *   - a file commit reads the current blob SHA first, so re-committing the
 *     same path updates in place instead of failing;
 *   - the PR is opened once per branch, then reused (we never open duplicates).
 *
 * Auth: a fine-grained or classic PAT in `GITHUB_DATA_TOKEN` with `contents:write`
 * + `pull_requests:write` (classic: `repo`). Repo is auto-detected from
 * `GITHUB_DATA_REPO` ("owner/name") or the `VERCEL_GIT_REPO_OWNER` /
 * `VERCEL_GIT_REPO_SLUG` pair Vercel injects at build/runtime.
 *
 * This module uses only `fetch` (no deps) so it runs in the Node.js runtime
 * of a route handler. It NEVER throws for a missing token — callers check the
 * returned `{ ok }` and fall back to `persisted:false`.
 * --------------------------------------------------------------------------
 */

const GH_API = "https://api.github.com";

function getConfig() {
    const token = process.env.GITHUB_DATA_TOKEN || "";
    let repo = process.env.GITHUB_DATA_REPO || "";
    if (!repo && process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG) {
        repo = `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`;
    }
    const base = process.env.GITHUB_DATA_BASE_BRANCH || "main";
    return { token, repo, base };
}

export function isConfigured() {
    const { token, repo } = getConfig();
    return Boolean(token && repo);
}

async function gh(token, method, urlPath, body) {
    const res = await fetch(`${GH_API}${urlPath}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "summerfindslab-writeback",
            ...(body ? { "Content-Type": "application/json" } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store"
    });
    let json = null;
    const text = await res.text();
    if (text) {
        try {
            json = JSON.parse(text);
        } catch {
            json = { raw: text.slice(0, 300) };
        }
    }
    return { status: res.status, ok: res.ok, json };
}

/** base64-encode a UTF-8 string in both Node and edge-ish runtimes. */
function toBase64(str) {
    if (typeof Buffer !== "undefined") return Buffer.from(str, "utf8").toString("base64");
    // eslint-disable-next-line no-undef
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    // eslint-disable-next-line no-undef
    return btoa(bin);
}

/** Get the SHA the base branch currently points at. */
async function getBaseSha(token, repo, base) {
    const r = await gh(token, "GET", `/repos/${repo}/git/ref/heads/${base}`);
    if (!r.ok) throw new Error(`base ref ${base}: ${r.status}`);
    return r.json.object.sha;
}

/** Create the daily branch if missing; reused on later calls. */
async function ensureBranch(token, repo, branch, baseSha) {
    const existing = await gh(token, "GET", `/repos/${repo}/git/ref/heads/${branch}`);
    if (existing.ok) return { created: false };
    const created = await gh(token, "POST", `/repos/${repo}/git/refs`, {
        ref: `refs/heads/${branch}`,
        sha: baseSha
    });
    if (!created.ok && created.status !== 422) {
        // 422 = ref already exists (race) — treat as fine.
        throw new Error(`create branch ${branch}: ${created.status}`);
    }
    return { created: created.ok };
}

/** Commit (create or update) one file on the branch via the Contents API. */
async function putFile(token, repo, branch, filePath, contentStr, message) {
    // Look up existing blob sha on this branch (needed to update in place).
    let sha;
    const current = await gh(
        token,
        "GET",
        `/repos/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${branch}`
    );
    if (current.ok && current.json && current.json.sha) sha = current.json.sha;

    const put = await gh(
        token,
        "PUT",
        `/repos/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`,
        {
            message,
            content: toBase64(contentStr),
            branch,
            ...(sha ? { sha } : {})
        }
    );
    if (!put.ok) throw new Error(`put ${filePath}: ${put.status} ${JSON.stringify(put.json).slice(0, 200)}`);
    return put.json.commit && put.json.commit.sha;
}

/** Open a PR for the branch, or return the existing open one. Idempotent. */
async function ensurePr(token, repo, branch, base, title) {
    const existing = await gh(
        token,
        "GET",
        `/repos/${repo}/pulls?head=${repo.split("/")[0]}:${branch}&state=open`
    );
    if (existing.ok && Array.isArray(existing.json) && existing.json.length > 0) {
        return { number: existing.json[0].number, url: existing.json[0].html_url, created: false };
    }
    const created = await gh(token, "POST", `/repos/${repo}/pulls`, {
        title,
        head: branch,
        base,
        body:
            "Automated data write-back (ADR-001). Generated by an ingest endpoint " +
            "when the Vercel filesystem is read-only. Review and merge to publish.",
        maintainer_can_modify: true
    });
    if (!created.ok) {
        // 422 can mean a PR already exists for this head; re-query.
        const retry = await gh(
            token,
            "GET",
            `/repos/${repo}/pulls?head=${repo.split("/")[0]}:${branch}&state=open`
        );
        if (retry.ok && Array.isArray(retry.json) && retry.json.length > 0) {
            return { number: retry.json[0].number, url: retry.json[0].html_url, created: false };
        }
        throw new Error(`open pr: ${created.status} ${JSON.stringify(created.json).slice(0, 200)}`);
    }
    return { number: created.json.number, url: created.json.html_url, created: true };
}

/**
 * Commit one or more files to `auto/data-<date>` and ensure a PR is open.
 *
 * @param {Object} opts
 * @param {Array<{path:string, content:string}>} opts.files - repo-relative paths + UTF-8 content
 * @param {string} [opts.message] - commit message
 * @param {string} [opts.date] - YYYY-MM-DD; defaults to today (UTC)
 * @returns {Promise<{ok:boolean, persisted?:boolean, branch?:string, pr?:object, commit?:string, error?:string}>}
 */
export async function commitDataFiles({ files, message, date } = {}) {
    const { token, repo, base } = getConfig();
    if (!token || !repo) {
        return { ok: false, persisted: false, error: "github_writeback_not_configured" };
    }
    if (!Array.isArray(files) || files.length === 0) {
        return { ok: false, persisted: false, error: "no_files" };
    }

    const day = date || new Date().toISOString().slice(0, 10);
    const branch = `auto/data-${day}`;
    const commitMsg = message || `chore(data): automated write-back ${day}`;

    try {
        const baseSha = await getBaseSha(token, repo, base);
        await ensureBranch(token, repo, branch, baseSha);

        let lastCommit;
        for (const f of files) {
            lastCommit = await putFile(token, repo, branch, f.path, f.content, commitMsg);
        }

        const pr = await ensurePr(
            token,
            repo,
            branch,
            base,
            `chore(data): automated write-back ${day}`
        );

        return { ok: true, persisted: true, branch, commit: lastCommit, pr };
    } catch (err) {
        return {
            ok: false,
            persisted: false,
            error: String((err && err.message) || err).slice(0, 300)
        };
    }
}
