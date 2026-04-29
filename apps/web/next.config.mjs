/** @type {import('next').NextConfig} */
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
  connect-src 'self' http://localhost:8080 http://127.0.0.1:8080 http://localhost:3000 http://127.0.0.1:3000;
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

const nextConfig = {
  reactStrictMode: true,
  output: isWindows ? undefined : "standalone",
  transpilePackages: ["@parkflow/types", "@parkflow/print-core"],
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
