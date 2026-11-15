import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self' http://127.0.0.1:* https://*.supabase.co wss://*.supabase.co;",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;",
      "worker-src 'self' blob:;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data: blob:;",
      "connect-src 'self' http://127.0.0.1:* https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net;",
      "font-src 'self' data:;",
      "frame-ancestors 'none';",
      "form-action 'self';",
      "base-uri 'self';",
    ].join(" "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
