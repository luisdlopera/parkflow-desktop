import type { StoredSession } from "../types";

const STORAGE_KEY = "parkflow.auth.session";

export async function tauriInvoke<T>(cmd: string, payload?: unknown): Promise<T | null> {
  const tauriInternals = typeof window !== "undefined" ? (window as any).__TAURI_INTERNALS__ : undefined;
  if (typeof tauriInternals?.invoke !== "function") return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(cmd, payload as Record<string, unknown> | undefined);
  } catch {
    return null;
  }
}

/**
 * DEPRECATED: Browser storage via localStorage is no longer used for web.
 * Tokens are now stored in httpOnly cookies, which the browser handles automatically.
 * This function is kept for reference but returns null on web.
 * Tauri desktop still uses its secure storage.
 */
function readBrowserStorage(): StoredSession | null {
  if (typeof window === "undefined") return null;
  // Web: httpOnly cookies are handled by browser automatically, not readable from JS
  // Tauri: storage is handled via tauriInvoke, not via localStorage
  return null;
}

/**
 * DEPRECATED: No longer writes to localStorage for web.
 * Tokens are stored in httpOnly cookies (handled by server Set-Cookie headers).
 * Tauri uses tauriInvoke for secure storage (see saveSession).
 */
function writeBrowserStorage(session: StoredSession | null): void {
  if (typeof window === "undefined") return;
  // Web: httpOnly cookies are set by server (Set-Cookie headers), no client-side write needed
  // Tauri: writes to secure storage via tauriInvoke (see saveSession)
}

let memorySession: StoredSession | null = null;

export async function loadSession(): Promise<StoredSession | null> {
  // Check memory first (fastest)
  if (memorySession) return memorySession;

  // Tauri desktop: try secure storage
  const tauri = await tauriInvoke<StoredSession>("auth_load_session");
  if (tauri) {
    memorySession = tauri;
    return tauri;
  }

  // Web: httpOnly cookies are handled by browser automatically.
  // If we get here after a page reload, the browser will send cookies in requests.
  // Session data will be restored via the /auth/me endpoint (called by providers).
  // readBrowserStorage() now returns null (localStorage no longer used).
  const browser = readBrowserStorage();
  memorySession = browser;
  return browser;
}

export async function saveSession(session: StoredSession): Promise<void> {
  memorySession = session;

  // Tauri desktop: save to secure storage
  await tauriInvoke<void>("auth_store_session", { payloadJson: JSON.stringify(session) });

  // Web: tokens are in httpOnly cookies (set by server).
  // No client-side write needed. writeBrowserStorage() is deprecated.
}

export async function clearSession(): Promise<void> {
  memorySession = null;

  // Tauri desktop: clear secure storage
  await tauriInvoke<void>("auth_clear_session");

  // Web: cookies are cleared by server via Set-Cookie with Max-Age=0 (in /logout endpoint).
  // No client-side write needed.
}
