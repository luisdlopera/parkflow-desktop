/**
 * CSRF Token Reader
 *
 * Reads the `XSRF-TOKEN` cookie set by Spring Security's
 * CookieCsrfTokenRepository and exposes the value to be sent back as the
 * `X-XSRF-TOKEN` header on mutating requests (POST/PUT/PATCH/DELETE).
 *
 * Server-side contract (see SecurityConfig.java):
 *   - Cookie name: XSRF-TOKEN     (httpOnly=false, sameSite=Lax)
 *   - Header name: X-XSRF-TOKEN   (Spring default; must match cookie value)
 *   - Backend uses CsrfTokenRequestAttributeHandler (no XOR) so the cookie
 *     value is identical to the header value.
 *
 * The cookie is issued on the FIRST response from the API (via the
 * CsrfCookieFilter) so any subsequent mutating request can echo it.
 */

export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Returns true when the request method is one that requires a CSRF token.
 */
export function isMutatingMethod(method: string | undefined | null): boolean {
  if (!method) return false;
  return MUTATING_METHODS.has(method.toUpperCase());
}

/**
 * Reads the XSRF-TOKEN cookie from `document.cookie`.
 * Safe to call on the server (returns null) and in tests without a document.
 */
export function readCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined" || !document.cookie) {
    return null;
  }
  const target = `${CSRF_COOKIE_NAME}=`;
  for (const raw of document.cookie.split(";")) {
    const trimmed = raw.trim();
    if (trimmed.startsWith(target)) {
      const value = trimmed.slice(target.length);
      if (value.length > 0) return value;
    }
  }
  return null;
}

/**
 * Returns header entries for a mutating request, picking up the
 * XSRF-TOKEN cookie. Returns `{}` when no token is available yet
 * (the caller may choose to issue a preflight to obtain one).
 */
export function withCsrfHeader(
  init?: { method?: string },
  baseHeaders: Record<string, string> = {},
): Record<string, string> {
  if (!isMutatingMethod(init?.method)) {
    return baseHeaders;
  }
  const token = readCsrfTokenFromCookie();
  if (!token) {
    return baseHeaders;
  }
  return { ...baseHeaders, [CSRF_HEADER_NAME]: token };
}
