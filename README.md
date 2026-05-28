# Summer Finds Lab Daily ☀️

A modern, Pinterest-style affiliate website built with **Next.js 14 (App Router)** and **Tailwind CSS**. Curates Amazon summer gadgets, beach essentials, viral TikTok finds, aesthetic room upgrades and travel accessories.

## ✨ Features

- Beautiful homepage with hero, category rail, and Pinterest-style masonry feed
- Reusable components (Navbar, Footer, ProductCard, ProductGrid, BlogCard, Newsletter)
- "Trending Summer Finds", "Under $25", and "TikTok Made Me Buy It" sections
- Dynamic category pages (`/category/[slug]`) and blog posts (`/blog/[slug]`)
- SEO ready: metadata, Open Graph, sitemap.xml, robots.txt
- Mobile-first, responsive, fast loading
- Soft summer color palette and modern luxury feel
- All product data lives in `data/products.json` so future automation (scripts, scrapers, or a CMS) can simply update that one file

## 📁 Folder structure

```
summerfindslab-site/
├─ app/
│  ├─ layout.js           # Root layout, fonts, metadata
│  ├─ page.js             # Homepage
│  ├─ globals.css         # Tailwind + custom styles
│  ├─ sitemap.js          # Auto-generated sitemap
│  ├─ robots.js           # robots.txt rules
│  ├─ trending/page.js
│  ├─ under-25/page.js
│  ├─ tiktok-finds/page.js
│  ├─ categories/page.js
│  ├─ category/[slug]/page.js
│  ├─ blog/page.js
│  ├─ blog/[slug]/page.js
│  ├─ about/page.js
│  ├─ disclosure/page.js
│  ├─ privacy/page.js
│  └─ not-found.js
├─ components/
│  ├─ Navbar.js
│  ├─ Footer.js
│  ├─ Hero.js
│  ├─ ProductCard.js
│  ├─ ProductGrid.js
│  ├─ CategoryRail.js
│  ├─ BlogCard.js
│  ├─ SectionHeader.js
│  └─ Newsletter.js
├─ data/
│  ├─ products.json       # Drop new products here
│  ├─ categories.json
│  └─ posts.json
├─ lib/
│  ├─ products.js         # Data helpers
│  └─ site.js             # Site config (name, nav, social)
├─ public/                # Static assets
├─ tailwind.config.js
├─ postcss.config.js
├─ next.config.mjs
└─ package.json
```

## 🚀 Run it locally

You'll need Node.js installed. The latest version is **v26.2.0** (recommended) but anything **18.17+** will work. [Download Node.js](https://nodejs.org).

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:3000
```

That's it. Edit any file under `app/` or `components/` and the page hot-reloads.

## 🛠️ Customize quickly

- **Site name, social links, navigation:** `lib/site.js`
- **Colors and fonts:** `tailwind.config.js`
- **Products:** `data/products.json` — each entry has `id`, `title`, `description`, `price`, `category`, `tags` (e.g. `trending`, `tiktok`, `under-25`), `image`, `affiliateUrl`
- **Categories:** `data/categories.json`
- **Blog posts:** `data/posts.json`

> Replace `https://www.amazon.com/?tag=YOUR-AFFILIATE-ID` in `data/products.json` with your real Amazon Associates tag once approved.

## 🌐 Deploy on Vercel

The fastest way to deploy a Next.js app.

### Option A — One-click via the Vercel dashboard

1. Push this folder to a new **GitHub** repo.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Click **Import** on your repo.
4. Vercel auto-detects Next.js. Leave defaults as-is.
5. Click **Deploy**. You'll get a live URL in about a minute.

### Option B — Deploy from your terminal

```bash
npm install -g vercel
vercel        # follow the prompts, link to your account
vercel --prod # ship to production
```

### After deploy

- Set your custom domain in **Vercel → Project → Settings → Domains**.
- Update `siteConfig.url` in `lib/site.js` to your live URL so SEO metadata, OG tags and sitemap point to the right place.
- Replace placeholder social links in `lib/site.js` and the affiliate IDs in `data/products.json`.

## 🤖 Future automation

Because all products live in a single JSON file, you can plug in any source later:

- A daily Node script that scrapes new products and writes to `data/products.json`
- An n8n / Make / Zapier flow that updates the file
- A CMS export (Sanity, Contentful, Notion) → JSON

Just rebuild and redeploy (Vercel can do this automatically on every git push).

## 📬 License

Personal/commercial use. Replace placeholder copy and disclaimers with your own before launching.
