import type { StoredSession } from "@/features/auth/types";
import { createAuthProvider } from "@/auth/runtime/createAuthProvider";

let memorySession: StoredSession | null = null;

// Session metadata key (not the session itself - that stays in memory)
const SESSION_TIMESTAMP_KEY = "parkflow:session:timestamp";
const SESSION_INVALIDATED_KEY = "parkflow:session:invalidated";

export async function loadSession(): Promise<StoredSession | null> {
  // Check memory first (fast path)
  if (memorySession) return memorySession;

  // Check if session was invalidated in another tab
  if (typeof window !== "undefined") {
    const invalidated = localStorage.getItem(SESSION_INVALIDATED_KEY);
    if (invalidated === "true") {
      return null; // Session was logged out in another tab
    }
  }

  try {
    const session = await (await createAuthProvider()).restoreSession();
    if (!session) return null;

    memorySession = {
      user: session.user,
      session: session.session,
      offlineLease: session.offlineLease,
    } as StoredSession;

    // Track session timestamp for tab sync
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      localStorage.removeItem(SESSION_INVALIDATED_KEY);
    }

    return memorySession;
  } catch (error) {
    console.error("[Auth Storage] Failed to restore session:", error);
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  memorySession = session;
  // Update timestamp so other tabs know session is fresh
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    localStorage.removeItem(SESSION_INVALIDATED_KEY);
  }
}

export async function clearSession(): Promise<void> {
  memorySession = null;
  // Broadcast logout to other tabs
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_INVALIDATED_KEY, "true");
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  }
}

// Setup cross-tab synchronization (call on app init)
export function setupCrossTabSync(onSessionInvalidated: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === SESSION_INVALIDATED_KEY && event.newValue === "true") {
      // Another tab logged out - clear memory and redirect
      memorySession = null;
      onSessionInvalidated();
    } else if (event.key === SESSION_TIMESTAMP_KEY && event.newValue) {
      // Another tab updated session - reload from server next time
      memorySession = null;
    }
  };

  window.addEventListener("storage", handleStorageChange);

  // Cleanup function
  return () => {
    window.removeEventListener("storage", handleStorageChange);
  };
}
