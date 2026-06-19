/**
 * Single source of truth for API base URLs.
 *
 * Only NEXT_PUBLIC_API_BASE_URL is required in the environment.
 * All other base URLs are derived from it:
 *   NEXT_PUBLIC_API_BASE_URL = http://host/api/v1/operations
 *   apiBase()  = http://host/api/v1
 *   opsBase()  = http://host/api/v1/operations
 *   cfgBase()  = http://host/api/v1/configuration
 *   authBase() = http://host/api/v1/auth  (or NEXT_PUBLIC_AUTH_BASE_URL)
 */

const OPS_DEFAULT = "http://localhost:6011/api/v1/operations";

export const API_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:6011/api/v1",
  authBaseUrl: process.env.NEXT_PUBLIC_AUTH_BASE_URL || "http://localhost:6011/api/v1/auth",
  tauriPrintPort: process.env.NEXT_PUBLIC_TAURI_PRINT_PORT || "1420",
  apiKey: process.env.NEXT_PUBLIC_API_KEY || "dev-api-key-123",
};

function rawOps(): string {
  return (API_CONFIG.baseUrl ?? OPS_DEFAULT).replace(/\/$/, "");
}

/** Base URL for the v1 API: http://host/api/v1 */
export function apiBase(): string {
  return rawOps().replace(/\/operations$/i, "");
}

/** Operations endpoint: http://host/api/v1/operations */
export function opsBase(): string {
  return rawOps();
}

/** Configuration endpoint: http://host/api/v1/configuration */
export function cfgBase(): string {
  return `${apiBase()}/configuration`;
}

/** Auth endpoint: http://host/api/v1/auth */
export function authBase(): string {
  const explicit = API_CONFIG.authBaseUrl?.trim();
  return explicit ? explicit.replace(/\/$/, "") : `${apiBase()}/auth`;
}
