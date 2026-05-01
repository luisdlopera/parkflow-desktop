import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

// SECURITY: Content Security Policy headers
// Adjust connect-src to include your API endpoints in production
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' http://localhost:6011 http://127.0.0.1:6011 http://localhost:6012 http://127.0.0.1:6012 http://localhost:6001 http://127.0.0.1:6001 http://localhost:6002 http://127.0.0.1:6002;
  upgrade-insecure-requests;
`.replace(/\s+/g, ' ').trim();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isWindows ? undefined : "standalone",
  transpilePackages: ["@parkflow/types", "@parkflow/print-core", "@heroui/*"],
  // SECURITY: Add security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
