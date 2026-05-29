#!/usr/bin/env node
/**
 * extract-amazon-images.mjs
 * --------------------------------------------------------------------------
 * Resolves each Amazon affiliate short link (amzn.to / a.co / amazon.com/dp)
 * and tries to extract the highest-quality real product image + title + ASIN.
 *
 * Output: cached at /content/cache/amazon-images.json keyed by affiliate URL.
 *
 * Strategy (no external deps):
 *  1. HEAD/GET the short URL → follow redirects → pull the canonical Amazon URL
 *  2. Extract ASIN from the URL (`/dp/XXXXXXXXXX/`)
 *  3. Fetch the product page with a real-browser User-Agent + Accept-Language
 *  4. Parse the HTML for:
 *      - og:image / twitter:image
 *      - JSON-LD <script type="application/ld+json"> Product entries
 *      - inline `data-old-hires` / `data-a-dynamic-image` attributes
 *  5. Promote the image to the largest available size (Amazon serves _SL1500_)
 *  6. Cache the result. Re-runs are instant for cached URLs.
 *
 * If Amazon returns a CAPTCHA / 503 (common for unauthenticated bulk fetches),
 * we record `{ status: "blocked" }` and the row falls back to the curated
 * category image at render time. This is the correct, ToS-compatible behaviour.
 *
 * For production scale, swap `fetchProductPage()` with a call to Amazon's
 * Product Advertising API (PA-API). The shape of the cache is API-compatible.
 *
 * Run:
 *   npm run import:images          # only fetch missing/stale URLs
 *   npm run import:images -- --refresh  # force re-fetch
 * --------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMPORTS_DIR = path.join(ROOT, "content", "imports");
const CACHE_DIR = path.join(ROOT, "content", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "amazon-images.json");

const REFRESH = process.argv.includes("--refresh");
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity", // we parse text not gzip
    "Cache-Control": "no-cache",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
};

/* ------------------------------ Helpers ------------------------------ */

function loadCache() {
    if (!fs.existsSync(CACHE_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    } catch {
        return {};
    }
}

function saveCache(cache) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + "\n");
}

function readAffiliateUrls() {
    if (!fs.existsSync(IMPORTS_DIR)) return [];
    const files = fs
        .readdirSync(IMPORTS_DIR)
        .filter((f) => f.toLowerCase().endsWith(".csv"));
    const urls = new Set();
    for (const f of files) {
        const text = fs.readFileSync(path.join(IMPORTS_DIR, f), "utf8");
        text.split(/\r?\n/).forEach((line) => {
            const m = line.match(/^(https?:\/\/[^\s,"]+)/);
            if (m) urls.add(m[1].trim());
        });
    }
    return Array.from(urls);
}

function extractAsin(url) {
    const patterns = [
        /\/dp\/([A-Z0-9]{10})/i,
        /\/gp\/product\/([A-Z0-9]{10})/i,
        /\/product\/([A-Z0-9]{10})/i,
        /\bASIN[=:]([A-Z0-9]{10})/i
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1].toUpperCase();
    }
    return null;
}

function asinImageUrl(asin, size = "SL1500") {
    if (!asin) return null;
    // Amazon's media CDN serves product imagery via /images/I/<id> — for the ASIN
    // path we can't construct it deterministically without the image hash, but
    // Amazon does mirror at /images/P/<ASIN>.01._SL1500_.jpg as a fallback.
    return `https://m.media-amazon.com/images/P/${asin}.01._${size}_.jpg`;
}

function promoteImageSize(url, size = "SL1500") {
    if (!url) return url;
    return url.replace(/_S[A-Z]?\d+_\.jpg/i, `_${size}_.jpg`);
}

async function fetchPage(url, redirectsLeft = 6) {
    const res = await fetch(url, {
        headers: HEADERS,
        redirect: "manual"
    });

    // Manual redirect so we can keep cookies sane and unwrap shorteners
    if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (loc && redirectsLeft > 0) {
            const next = new URL(loc, url).toString();
            return fetchPage(next, redirectsLeft - 1);
        }
    }
    return { res, finalUrl: url };
}

function parseFromHtml(html) {
    // 1. og:image
    const og = html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    let image = og?.[1] ?? null;

    // 2. twitter:image fallback
    if (!image) {
        const tw = html.match(
            /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
        );
        image = tw?.[1] ?? null;
    }

    // 3. data-old-hires (largest detail-page image)
    if (!image) {
        const hi = html.match(/data-old-hires=["']([^"']+)["']/i);
        image = hi?.[1] ?? null;
    }

    // 4. JSON-LD Product
    if (!image) {
        const jsonLd = html.match(
            /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
        );
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd[1]);
                const arr = Array.isArray(data) ? data : [data];
                for (const node of arr) {
                    if (node["@type"] === "Product" && node.image) {
                        image = Array.isArray(node.image) ? node.image[0] : node.image;
                        break;
                    }
                }
            } catch {
                /* ignore */
            }
        }
    }

    // 5. og:title
    const ogTitle = html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    );
    const title = ogTitle?.[1] ?? null;

    return { image: image ? promoteImageSize(image) : null, title };
}

async function resolveOne(affiliateUrl) {
    try {
        const { res, finalUrl } = await fetchPage(affiliateUrl);
        const asin = extractAsin(finalUrl);

        if (res.status === 503 || res.status === 429) {
            return {
                affiliateUrl,
                asin,
                finalUrl,
                image: asin ? asinImageUrl(asin) : null,
                title: null,
                status: "blocked-fallback-asin",
                fetchedAt: new Date().toISOString()
            };
        }

        if (!res.ok) {
            return {
                affiliateUrl,
                asin,
                finalUrl,
                image: asin ? asinImageUrl(asin) : null,
                title: null,
                status: `http-${res.status}`,
                fetchedAt: new Date().toISOString()
            };
        }

        const html = await res.text();
        const parsed = parseFromHtml(html);

        return {
            affiliateUrl,
            asin,
            finalUrl,
            image: parsed.image || (asin ? asinImageUrl(asin) : null),
            title: parsed.title,
            status: parsed.image ? "ok" : asin ? "fallback-asin" : "no-image",
            fetchedAt: new Date().toISOString()
        };
    } catch (err) {
        return {
            affiliateUrl,
            asin: extractAsin(affiliateUrl),
            finalUrl: affiliateUrl,
            image: null,
            title: null,
            status: `error-${err.code || err.name}`,
            fetchedAt: new Date().toISOString()
        };
    }
}

/* ------------------------------- Main ------------------------------- */

async function main() {
    const cache = loadCache();
    const urls = readAffiliateUrls();
    if (!urls.length) {
        console.log("No affiliate URLs found in /content/imports/.");
        return;
    }

    console.log(`Found ${urls.length} affiliate URLs.`);
    let resolved = 0;
    let skipped = 0;

    for (const url of urls) {
        const cached = cache[url];
        const fresh =
            cached &&
            cached.fetchedAt &&
            Date.now() - new Date(cached.fetchedAt).getTime() < MAX_AGE_MS;

        if (cached && fresh && !REFRESH) {
            skipped++;
            continue;
        }

        process.stdout.write(`  ${url}\n`);
        const result = await resolveOne(url);
        cache[url] = result;
        resolved++;
        process.stdout.write(
            `    → ${result.status}${result.asin ? `  asin=${result.asin}` : ""}${result.image ? "  ✓image" : "  ✗no-image"
            }\n`
        );

        // 1.2s polite delay between requests
        await new Promise((r) => setTimeout(r, 1200));
        saveCache(cache);
    }

    console.log(
        `Done. Resolved ${resolved}, skipped ${skipped} (cached). Cache: ${CACHE_FILE}`
    );
}

main();
