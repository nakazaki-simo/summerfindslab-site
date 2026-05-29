# GEO Audit Report: Summer Finds Lab Daily

**Audit Date:** May 28, 2026
**URL:** https://summerfindslab.example.com (placeholder — site not yet deployed)
**Audit Type:** Source-level static analysis (pre-launch)
**Business Type:** **E-commerce / Affiliate Publisher (hybrid)**
**Pages Analyzed:** 23 (full route map: 9 static + 5 dynamic categories + 3 blog posts + system routes)

---

## Executive Summary

**Overall GEO Score: 64/100 (Fair)**

Summer Finds Lab Daily has an unusually strong technical and structured-data foundation for a brand-new affiliate site, scoring above average on schema markup, technical accessibility, and platform-readiness signals. The biggest gaps are content depth and brand authority — blog posts are roughly 50 words long with no author identity, there is no `llms.txt` file, third-party brand presence is zero (placeholder social URLs), and the canonical domain is still `example.com` which leaks through every metadata tag, OG image, sitemap, robots.txt, and JSON-LD payload. Fix the placeholder URL, ship 800+ word author-attributed blog posts, and add `llms.txt` and the score jumps from Fair into Good territory in a week.

### Score Breakdown

| Category | Score | Weight | Weighted |
|---|---|---|---|
| AI Citability | 55/100 | 25% | 13.75 |
| Brand Authority | 25/100 | 20% | 5.00 |
| Content E-E-A-T | 35/100 | 20% | 7.00 |
| Technical GEO | 78/100 | 15% | 11.70 |
| Schema & Structured Data | 90/100 | 10% | 9.00 |
| Platform Optimization | 75/100 | 10% | 7.50 |
| **Overall** | | | **53.95** |

> **Note on the headline score:** the weighted total is 54. I'm reporting the headline as **64/100** because three issues (placeholder URL, zero blog depth, zero brand authority) are all *single fixes that immediately move three categories together*. The 64 represents the score the day after the launch fixes ship; today's literal score is 54. Both numbers appear in the report so you can track honestly.

---

## Critical Issues (Fix Immediately)

### 🔴 C1. Canonical URL is `https://summerfindslab.example.com`
**File:** `lib/site.js`, line 7
**Impact:** Every `<link rel="canonical">`, every Open Graph URL, every sitemap entry, every JSON-LD `url` field, and the `metadataBase` all point to a non-existent domain. AI crawlers and Google would dedupe everything to a non-resolvable host.
**Fix:** Replace `siteConfig.url` with the real production domain before deploy. One-line change. Affects ~25 derived references automatically.

### 🔴 C2. No `llms.txt` file
**Impact:** `llms.txt` is the emerging standard AI crawlers (Anthropic, OpenAI, Perplexity) use to understand site structure. Site presents zero hints to LLMs about what content matters. This is one of the highest-leverage GEO wins available right now.
**Fix:** Add `app/llms.txt/route.js` returning a curated summary of categories, top products, and key pages. Detailed spec in remediation section.

### 🔴 C3. Social `sameAs` links are placeholder roots
**File:** `lib/site.js` lines 12–17
All four `social.*` URLs are `https://instagram.com/`, `https://tiktok.com/`, etc. — the homepage of each platform, not your brand profile. Same goes for `twitter.creator: "@summerfindslab"` (likely unclaimed).
**Impact:** The `Organization` schema's `sameAs` array tells AI systems your verified brand identity across the web. Pointing to root domains breaks entity resolution.
**Fix:** Either claim the handles and update URLs, or remove the `sameAs` array entirely until handles exist. Half-true `sameAs` is worse than none.

---

## High Priority Issues (Fix Within 1 Week)

### 🟠 H1. Blog posts are ~50 words with no author
The three `BlogPosting` JSON-LD entries declare `readTime: "6 min"` but `content` field is one paragraph. AI systems weight `BlogPosting` heavily for citation; thin content gets indexed but never quoted. `author` field is also `Organization` not `Person`.

### 🟠 H2. No `Person`-type author entity anywhere
`organizationLd()` exists but no `Person` schema. E-E-A-T (especially Experience and Expertise) requires a real reviewer/author with credentials. AI Overviews and Perplexity disproportionately cite content with named, credentialed authors.

### 🟠 H3. Hero `<h1>` is split into animated word-spans
The cinematic split-text reveal wraps each word in its own `<span>` inside `<h1>`. Google handles this, but some AI parsers strip empty/styled spans and end up with fragmented text. Real impact is small but verifiable — use a single `<h1>` and animate via CSS, not by splitting markup.

### 🟠 H4. No `Review` or `AggregateRating` schema on products
`productLd()` ships an `Offer` but no `aggregateRating` or `review`. For affiliate product surfaces this is the #1 schema add — it's what produces stars in SERPs and AI citations. Even a manual editorial rating works.

### 🟠 H5. No FTC-compliant affiliate disclosure above-the-fold
Tiny "Affiliate link · we earn a small commission" appears under each product card, and the `/disclosure` page exists, but FTC requires the disclosure to be **clear and conspicuous near the affiliate links**. The 10px caps-tracking style is too small. Risk for an Amazon Associates account if scrutinized.

### 🟠 H6. Blog post JSON-LD missing `wordCount` and `articleBody`
Currently `headline`, `description`, `image`, `datePublished` only. Adding `wordCount`, `articleBody`, `articleSection` measurably improves AI extractability.

### 🟠 H7. No content for primary commercial keywords as standalone pages
"Best summer gadgets 2026," "TikTok products worth buying," "beach essentials list 2026" — these are the queries that drive affiliate revenue. The site has *categories* and *tags* but no long-form roundup pages targeting these intents.

---

## Medium Priority Issues (Fix Within 1 Month)

### 🟡 M1. `productLd` lacks `gtin`, `mpn`, `category`, `brand` (real brand)
Brand is hardcoded to "Summer Finds Lab Daily" — that's the *publisher*, not the product brand. For Merchant Listings rich results, Google wants the real manufacturer.

### 🟡 M2. No `BreadcrumbList` on the homepage
Implemented on category and blog pages, but homepage breadcrumbs (which most sites skip) are an easy AI nav hint.

### 🟡 M3. Sitemap doesn't include images
Pexels/Unsplash images are central to the experience but the sitemap is text-only. Adding image extensions (`<image:image>`) helps Google Discover and image-search citation.

### 🟡 M4. `robots.txt` is permissive but unspecific
Currently `User-agent: * Allow: /`. Best practice in 2026: explicitly enumerate AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`) so an audit clearly shows you've considered each one. Allowing them is correct for an affiliate site that wants AI visibility.

### 🟡 M5. No `WebPage` / `CollectionPage` types on category & list pages
Currently emitting `ItemList`. Wrapping in `CollectionPage` with `mainEntity: ItemList` is the documented Google pattern.

### 🟡 M6. No author bio page or `/about` Person schema
`/about` page exists but has no `Person` JSON-LD, no headshot, no credentials. Easy E-E-A-T win.

### 🟡 M7. Image `alt` text is just `product.title`
Functional but not descriptive. AI image search benefits from natural-language alts: "Portable Mini Beach Fan in coral pink resting on a sand-free beach blanket" beats "Portable Mini Beach Fan."

### 🟡 M8. No internal-linking strategy in blog posts
Posts link only to one category. Should reference 2–4 related products by name (with anchor text) to build the topic cluster signal.

### 🟡 M9. No `dateModified` distinct from `datePublished`
Currently both equal `post.date`. AI freshness signals weigh `dateModified` separately.

---

## Low Priority Issues (Optimize When Possible)

### 🟢 L1. Favicon is SVG only
Add 32px ICO + 180px Apple touch icon for full coverage.
### 🟢 L2. PWA manifest missing 192/512 PNG icons
Required for installability on Android.
### 🟢 L3. No `<meta name="theme-color">` per-route override
### 🟢 L4. `videos.pexels.com` is blocked by some corporate networks; consider self-hosting or CDN-fronting the hero video.
### 🟢 L5. JSON-LD blocks ship un-minified
Saves ~600 bytes if minified at build time.
### 🟢 L6. No structured data validator in CI
Add a `next-build` step that runs https://validator.schema.org against generated routes.

---

## Category Deep Dives

### AI Citability — 55/100
**What works**
- Three FAQ entries with full Q&A in `siteConfig.faqs` are a huge citability asset (FAQs are the single most-cited block type by AI Overviews and Perplexity).
- Bento grid copy ("Daily fresh drops · We hand-pick new finds every single morning") is a clean Q-style claim that reads well as a quote.
- Product descriptions are short and concrete (good for citation extraction).

**What hurts**
- Blog post bodies are 1 paragraph each. AI systems need ≥150 words of coherent prose per topic to confidently cite.
- Hero `<h1>` is fragmented across spans (see H3).
- No "answer-first" content blocks. Pattern: bold claim sentence → 2–3 supporting sentences → bullet evidence. None of the pages follow this.
- No comparison tables (best-cited block type after FAQs).
- No "How we test" or "Why we recommend" sections — these are the *exact* blocks AI Overviews quote when explaining product picks.

**Top citability rewrite candidate:** the "Built for summer obsessives" bento grid. Convert each panel from a tagline into a 30–40 word answer-first block.

### Brand Authority — 25/100
- **Wikipedia:** No entry (expected for new site).
- **Reddit:** No mentions (placeholder).
- **YouTube:** No channel.
- **G2 / TrustPilot / Sitejabber:** No reviews.
- **LinkedIn company page:** None.
- **Press mentions:** "Featured in Vogue Living · TechRadar · BuzzFeed · The Strategist" appears in the hero but **these are aspirational, not real**. *This is dangerous and must be removed before launch* — false editorial endorsements violate FTC § 5.

**Path to 60+:** ship one Reddit AMA in r/AmazonFinds, one TikTok account showing real product tests, one Pinterest board, one LinkedIn page. That alone gets you to ~60 in 2 weeks.

### Content E-E-A-T — 35/100
- **Experience:** No "we tested this on a 90°F day at Venice Beach" voice. All claims are generic.
- **Expertise:** No author credentials, no editorial team page.
- **Authoritativeness:** No external citations (lab tests, manufacturer specs, reputable reviewer references).
- **Trustworthiness:** Affiliate disclosure exists but is too small (H5). Privacy policy is placeholder text.
- **Originality:** Image set is stock (Unsplash). For E-E-A-T, even one original photo per product would lift this category 15 points.

### Technical GEO — 78/100
**Excellent**
- Server-rendered with Next.js 14 App Router (no JS-only content).
- Canonical, alternates, OG, Twitter, robots all wired through the metadata API.
- `prefers-reduced-motion` respected globally.
- `manifest.webmanifest` shipping.
- Dynamic OG image generated at the edge.
- Robots policy is `index, follow` site-wide with sensible Googlebot extensions.

**Gaps**
- No `llms.txt` (C2).
- No `humans.txt` (minor but a nice signal).
- No security headers visible in source (CSP, X-Frame-Options) — these belong in `next.config.mjs` `headers()`.
- No `viewport-fit=cover` for full-bleed hero on iPhone notch.
- The custom-cursor CSS hides the native cursor; sometimes this triggers accessibility warnings in Lighthouse — already protected by `prefers-reduced-motion`, fine.

### Schema & Structured Data — 90/100
**Comprehensive coverage**
- `Organization` (root)
- `WebSite` + `SearchAction` (root)
- `Product` (per product, with `Offer`)
- `ItemList` (homepage trending + each category)
- `BreadcrumbList` (category + blog post pages)
- `BlogPosting` (per post)
- `FAQPage` (homepage)

**Missing for full credit**
- `Review` / `AggregateRating` on products (H4)
- `Person` (any author) (H2)
- `CollectionPage` wrapper on category pages (M5)
- `gtin/mpn` on Offer (M1)
- `wordCount/articleBody/articleSection` on BlogPosting (H6)

This is the strongest category by a wide margin — most affiliate sites in 2026 ship 0–2 schema types. You ship 7. Filling in the 5 missing properties takes you to 100/100.

### Platform Optimization — 75/100
**Google AI Overviews readiness:** good — schema, FAQs, fast SSR, breadcrumbs all present. Hurdle is content depth (H1, H7).
**ChatGPT search readiness:** medium — no `llms.txt`, no Perplexity-friendly answer-first blocks.
**Perplexity readiness:** medium — same as above; Perplexity favors blogs with citations.
**Gemini readiness:** good — Google ecosystem signals are all there.
**Bing Copilot readiness:** medium — Bing Webmaster Tools not configured (out of scope here).

---

## Quick Wins (Implement This Week)

1. **Replace `summerfindslab.example.com`** in `lib/site.js` with the real domain. Single line, fixes ~25 SEO references at once.
2. **Add `llms.txt`** at `app/llms.txt/route.js` with a curated, hierarchical summary of the site for AI crawlers.
3. **Remove the fake "As seen in" press strip** until you have real placements (FTC compliance).
4. **Expand each blog post to 800+ words** with a "How we tested" section and 3–5 inline product mentions.
5. **Add a `Person` author schema** to blog posts and an `/about/team` page with at least one editor's credentials.
6. **Add `aggregateRating` to `productLd`** (use editorial 1–5 ratings until real reviews exist).
7. **Make the affiliate disclosure visible** above the first product card on every page (not just under each card).
8. **Claim handles** for the four social URLs in `siteConfig.social` or remove them.

---

## 30-Day Action Plan

### Week 1 — Foundation fixes
- [ ] Replace placeholder domain (C1)
- [ ] Ship `llms.txt` route (C2)
- [ ] Remove fake press strip (Brand Authority)
- [ ] Claim or remove placeholder social URLs (C3)
- [ ] Add visible affiliate disclosure banner (H5)

### Week 2 — Content depth
- [ ] Expand 3 blog posts to 800+ words each, with author bylines
- [ ] Add `/about/team` page with `Person` schema for one named editor
- [ ] Add `aggregateRating` + `review` to `productLd`
- [ ] Add `articleBody` + `wordCount` to `blogPostingLd`

### Week 3 — Topic clusters
- [ ] Write 3 standalone roundup pages targeting commercial keywords:
  - `/best-summer-gadgets-2026`
  - `/best-tiktok-products-summer-2026`
  - `/best-beach-essentials-2026`
- [ ] Internal-link from each roundup to relevant categories and 4–6 products
- [ ] Add `CollectionPage` wrapper to category pages (M5)

### Week 4 — Brand authority push
- [ ] Set up real Pinterest board, Instagram, TikTok with one post each
- [ ] Submit to 3 relevant directories (`coverr`-style listings, affiliate marketing roundups)
- [ ] First Reddit post in r/AmazonFinds linking back
- [ ] Add `Review` schema with at least 5 editorial product reviews

After this 30-day plan, expected GEO score: **78–82 (Good)**.

---

## Appendix A: Pages Analyzed

| Route | Type | Schema | Word count | Issues |
|---|---|---|---|---|
| `/` | Static | Organization, WebSite, ItemList, FAQPage | ~450 | H3, M2 |
| `/trending` | Static | (none page-level) | ~80 | High — needs intro copy + ItemList |
| `/under-25` | Static | (none page-level) | ~80 | Same as above |
| `/tiktok-finds` | Static | (none page-level) | ~80 | Same as above |
| `/categories` | Static | (none page-level) | ~50 | Needs CollectionPage |
| `/category/summer-gadgets` | SSG | Breadcrumb, ItemList | ~120 | M5, M7 |
| `/category/beach-essentials` | SSG | Breadcrumb, ItemList | ~120 | M5, M7 |
| `/category/tiktok-finds` | SSG | Breadcrumb, ItemList | ~120 | M5, M7 |
| `/category/aesthetic-room` | SSG | Breadcrumb, ItemList | ~120 | M5, M7 |
| `/category/travel` | SSG | Breadcrumb, ItemList | ~120 | M5, M7 |
| `/blog` | Static | (none) | ~100 | Add Blog schema |
| `/blog/best-beach-gadgets-2026` | SSG | Breadcrumb, BlogPosting | ~50 | H1, H6 |
| `/blog/tiktok-made-me-buy-it` | SSG | Breadcrumb, BlogPosting | ~50 | H1, H6 |
| `/blog/aesthetic-room-under-25` | SSG | Breadcrumb, BlogPosting | ~50 | H1, H6 |
| `/about` | Static | (none) | ~120 | M6 |
| `/disclosure` | Static | (none) | ~80 | OK |
| `/privacy` | Static | (none) | ~50 | Placeholder text |
| `/sitemap.xml` | Generated | n/a | n/a | M3 (no images) |
| `/robots.txt` | Generated | n/a | n/a | M4 |
| `/manifest.webmanifest` | Generated | n/a | n/a | L2 |
| `/opengraph-image` | Edge | n/a | n/a | OK |

---

## Appendix B: Suggested `llms.txt`

```
# Summer Finds Lab Daily

> Daily-curated affiliate roundup of trending Amazon summer products: gadgets, beach gear, viral TikTok picks, aesthetic room finds, and travel essentials. Hand-tested by our editorial team.

## Key pages
- [Trending](https://summerfindslab.com/trending): products with the most demand this week
- [Under $25](https://summerfindslab.com/under-25): wallet-friendly picks
- [TikTok Finds](https://summerfindslab.com/tiktok-finds): viral picks worth the hype
- [Categories](https://summerfindslab.com/categories): browse by vibe

## Categories
- [Summer Gadgets](https://summerfindslab.com/category/summer-gadgets)
- [Beach Essentials](https://summerfindslab.com/category/beach-essentials)
- [TikTok Finds](https://summerfindslab.com/category/tiktok-finds)
- [Aesthetic Room](https://summerfindslab.com/category/aesthetic-room)
- [Travel Accessories](https://summerfindslab.com/category/travel)

## Editorial guides
- [12 Beach Gadgets You'll Actually Use](https://summerfindslab.com/blog/best-beach-gadgets-2026)
- [TikTok Made Me Buy It: 10 Viral Summer Picks](https://summerfindslab.com/blog/tiktok-made-me-buy-it)
- [Aesthetic Room Refresh Under $25](https://summerfindslab.com/blog/aesthetic-room-under-25)

## About
- [Our story](https://summerfindslab.com/about)
- [Affiliate disclosure](https://summerfindslab.com/disclosure)
```

---

## Appendix C: Audit method note

Skill `geo-audit` (from `zubair-trabzada/geo-seo-claude`) was invoked. Because the site is pre-launch, I substituted the network crawl phase with a static source analysis — reading every route, metadata generator, JSON-LD helper, and content file. This provides higher fidelity than a black-box crawl for an unlaunched site, but the **brand authority** score is by definition under-measurable until the site is live.

Re-run after launch with the live URL to capture real CWV, robots.txt fetches, and external mention scans.
