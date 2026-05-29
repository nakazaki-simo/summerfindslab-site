import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";
import { siteConfig } from "@/lib/site";
import { organizationLd, websiteLd } from "@/lib/seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import Cursor from "@/components/Cursor";
import BackToTop from "@/components/BackToTop";
import JsonLd from "@/components/JsonLd";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter"
});

const playfair = Playfair_Display({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-playfair"
});

export const metadata = {
    metadataBase: new URL(siteConfig.url),
    title: {
        default: `${siteConfig.name} — ${siteConfig.tagline}`,
        template: `%s | ${siteConfig.name}`
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.shortName }],
    keywords: [
        "summer gadgets",
        "amazon finds",
        "amazon affiliate",
        "beach essentials",
        "tiktok made me buy it",
        "tiktok finds",
        "aesthetic room",
        "travel accessories",
        "trending summer 2026",
        "under 25 finds",
        "viral summer products"
    ],
    alternates: {
        canonical: "/"
    },
    openGraph: {
        title: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        siteName: siteConfig.name,
        type: "website",
        locale: "en_US"
    },
    twitter: {
        card: "summary_large_image",
        title: siteConfig.name,
        description: siteConfig.description,
        creator: "@summerfindslab"
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1
        }
    },
    category: "shopping",
    other: {
        // Pinterest Rich Pins / domain verification (TODO: replace with your tag)
        "pinterest-rich-pin": "true",
        "p:domain_verify": "REPLACE_WITH_PINTEREST_VERIFICATION_TAG",
        // For Google Site Verification (TODO)
        "google-site-verification": "REPLACE_WITH_GOOGLE_VERIFICATION_TAG"
    },
    formatDetection: {
        telephone: false,
        email: false,
        address: false
    }
};

export const viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
        { media: "(prefers-color-scheme: dark)", color: "#1f2a37" }
    ],
    width: "device-width",
    initialScale: 1
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
            <head>
                <JsonLd data={organizationLd()} />
                <JsonLd data={websiteLd()} />
            </head>
            <body className="font-sans bg-cream text-ink overflow-x-hidden cursor-none-supported">
                <SmoothScroll />
                <ScrollProgress />
                <Cursor />
                <Navbar />
                <main>{children}</main>
                <Footer />
                <BackToTop />
            </body>
        </html>
    );
}
