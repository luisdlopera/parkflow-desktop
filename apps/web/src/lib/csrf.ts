/**
 * CSRF Token Management
 *
 * Utilities for generating, storing, and including CSRF tokens in requests.
 * Tokens are generated server-side and cached locally with expiration.
 */

interface CsrfTokenResponse {
  token: string;
  headerName: string;
  expiresAt: string;
}

let cachedToken: string | null = null;
let cachedExpiresAt: Date | null = null;
const HEADER_NAME = 'X-CSRF-Token';

/**
 * Fetch a new CSRF token from the server
 */
async function fetchCsrfToken(): Promise<CsrfTokenResponse> {
  const response = await fetch('/api/v1/csrf/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include session cookies
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a valid CSRF token (cached or newly fetched)
 */
export async function getCsrfToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedExpiresAt && new Date() < cachedExpiresAt) {
    return cachedToken;
  }

  // Fetch new token
  try {
    const response = await fetchCsrfToken();
    cachedToken = response.token;
    cachedExpiresAt = new Date(response.expiresAt);
    return response.token;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    throw error;
  }
}

/**
 * Clear cached CSRF token (useful for logout)
 */
export function clearCsrfToken(): void {
  cachedToken = null;
  cachedExpiresAt = null;
}

/**
 * Add CSRF token to request headers
 */
export async function addCsrfTokenToHeaders(
  headers: Record<string, string>
): Promise<Record<string, string>> {
  try {
    const token = await getCsrfToken();
    return {
      ...headers,
      [HEADER_NAME]: token,
    };
  } catch (error) {
    console.error('Failed to add CSRF token to headers:', error);
    return headers;
  }
}

/**
 * Wrapper for fetch() that automatically includes CSRF token
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken();
    options.headers = {
      ...options.headers,
      [HEADER_NAME]: token,
    };
  }

  return fetch(url, options);
}

export const CSRF_HEADER_NAME = HEADER_NAME;
