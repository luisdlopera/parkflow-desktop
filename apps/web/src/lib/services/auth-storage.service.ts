import type { StoredSession } from "@/features/auth/types";
import { createAuthProvider } from "@/auth/runtime/createAuthProvider";

let memorySession: StoredSession | null = null;

export async function loadSession(): Promise<StoredSession | null> {
  if (memorySession) return memorySession;

  try {
    const session = await (await createAuthProvider()).restoreSession();
    if (!session) return null;

    memorySession = {
      user: session.user,
      session: session.session,
      offlineLease: session.offlineLease,
    } as StoredSession;
    return memorySession;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  memorySession = session;
}

export async function clearSession(): Promise<void> {
  memorySession = null;
}
