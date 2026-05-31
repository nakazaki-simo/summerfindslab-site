/**
 * scripts/canva/_shared.mjs
 * --------------------------------------------------------------------------
 * Bootstraps env loading and shared helpers for the Canva CLI scripts.
 *
 * We load `.env.local` if present, falling back to `.env`. This matches
 * Next.js behaviour so the same vars work in both runtimes.
 * --------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";

function parseDotenv(text) {
    const out = {};
    for (const lineRaw of text.split(/\r?\n/)) {
        const line = lineRaw.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

export function loadEnv() {
    const root = process.cwd();
    const candidates = [".env.local", ".env"];
    for (const name of candidates) {
        const p = path.join(root, name);
        if (!fs.existsSync(p)) continue;
        const parsed = parseDotenv(fs.readFileSync(p, "utf8"));
        for (const [k, v] of Object.entries(parsed)) {
            if (process.env[k] == null) process.env[k] = v;
        }
    }
}

export function parseArgs(argv = process.argv.slice(2)) {
    const args = {};
    for (const a of argv) {
        const m = a.match(/^--([^=]+)(?:=(.*))?$/);
        if (!m) continue;
        args[m[1]] = m[2] === undefined ? true : m[2];
    }
    return args;
}

export function pretty(obj) {
    return JSON.stringify(obj, null, 2);
}
