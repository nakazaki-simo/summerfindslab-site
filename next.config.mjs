/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        formats: ["image/avif", "image/webp"],
        deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60 * 60 * 24 * 7,
        remotePatterns: [
            { protocol: "https", hostname: "images.unsplash.com" },
            { protocol: "https", hostname: "source.unsplash.com" },
            { protocol: "https", hostname: "picsum.photos" },
            { protocol: "https", hostname: "images.pexels.com" },
            { protocol: "https", hostname: "m.media-amazon.com" },
            { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
            { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
            { protocol: "https", hostname: "images-fe.ssl-images-amazon.com" }
        ]
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()"
                    }
                ]
            },
            {
                source: "/llms.txt",
                headers: [{ key: "Cache-Control", value: "public, max-age=3600" }]
            }
        ];
    }
};

export default nextConfig;
