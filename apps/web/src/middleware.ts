import { NextRequest, NextResponse } from 'next/server';

/**
 * Security Middleware for Parkflow Web Application
 * 
 * Implements OWASP-recommended security headers:
 * - Content-Security-Policy (CSP) with nonce
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 * - Cross-Origin headers
 */

export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    `style-src 'self' 'nonce-${nonce}' https: 'unsafe-inline'`,
    "img-src 'self' blob: data: https://*.parkflow.dev",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.parkflow.dev ws://localhost:*",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  const response = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Security Headers
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(), usb=()'
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Prevent caching of sensitive pages
  if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
