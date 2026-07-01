import { safeStorage } from "@/lib/utils/storage";

/**
 * Remember Me service
 * Handles persistent storage of user email when "Recordarme" checkbox is marked.
 *
 * SECURITY NOTES:
 * - Only stores EMAIL (public information)
 * - Password NEVER stored
 * - Tokens stored in httpOnly cookies (browser/backend handles)
 * - Uses localStorage (5-10MB available, sufficient for single email)
 */

const REMEMBER_ME_STORAGE_KEY = "parkflow.auth.rememberMe";

export interface RememberMeData {
  email: string;
  rememberMe: true;
}

/**
 * Save email to localStorage when user marks "Recordarme"
 */
export function saveRememberMeEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    const data: RememberMeData = { email: email.trim(), rememberMe: true };
    safeStorage.setItem(REMEMBER_ME_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Silently fail if localStorage is unavailable (private mode, storage full, etc.)
    console.warn("Failed to save remember me email:", err);
  }
}

/**
 * Load saved email from localStorage
 * Returns null if nothing saved or localStorage is unavailable
 */
export function loadRememberMeEmail(): RememberMeData | null {
  if (typeof window === "undefined") return null;
  try {
    const data = safeStorage.getItem(REMEMBER_ME_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as unknown;
    // Validate structure
    if (
      parsed &&
      typeof parsed === "object" &&
      "email" in parsed &&
      typeof parsed.email === "string" &&
      parsed.email.trim().length > 0
    ) {
      return { email: parsed.email.trim(), rememberMe: true };
    }
    return null;
  } catch {
    // Silently fail if parse error (corrupted storage)
    return null;
  }
}

/**
 * Clear saved email from localStorage
 * Call on logout or when user unchecks "Recordarme"
 */
export function clearRememberMeEmail(): void {
  if (typeof window === "undefined") return;
  try {
    safeStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear remember me email:", err);
  }
}
