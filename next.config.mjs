const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://www.onemap.gov.sg https://*.supabase.co https://www.google-analytics.com https://challenges.cloudflare.com",
      "frame-src https://www.google.com https://maps.google.com https://challenges.cloudflare.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests"
    ].join("; ")
  }
];

const protectedHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store, max-age=0" }
];

const protectedRouteSources = [
  "/admin",
  "/admin/:path*",
  "/dashboard",
  "/dashboard/:path*",
  "/customer-portal",
  "/customer-portal/:path*",
  "/engineer-portal",
  "/engineer-portal/:path*",
  "/website-management",
  "/website-management/:path*",
  "/service-operations",
  "/service-operations/:path*",
  "/social-media",
  "/social-media/:path*",
  "/ai-intelligence",
  "/ai-intelligence/:path*",
  "/customer-center",
  "/customer-center/:path*",
  "/system-settings",
  "/system-settings/:path*",
  "/login"
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    workerThreads: false
  },
  eslint: {
    // Lint is enforced by npm run lint inside validate:predeploy before Vercel build:ci.
    ignoreDuringBuilds: true
  },
  typescript: {
    // Type safety is enforced by npm run typecheck inside validate:predeploy before Vercel build:ci.
    ignoreBuildErrors: true
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      },
      {
        source: "/assets/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      },
      {
        source: "/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      },
      ...protectedRouteSources.map((source) => ({ source, headers: protectedHeaders })),
      {
        source: "/api/:path*",
        headers: protectedHeaders
      }
    ];
  }
};

export default nextConfig;
