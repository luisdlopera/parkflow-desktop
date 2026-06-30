import { authBase } from "@/lib/api/config";
import type { LoginRequest } from "@parkflow/types";
import type { StoredSession } from "../types";
import { clearRememberMeEmail } from "@/lib/services/remember-me.service";
import { clearSession, saveSession } from "@/lib/services/auth-storage.service";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";
import { createAuthProvider } from "@/auth/runtime/createAuthProvider";

export async function login(request: LoginRequest): Promise<StoredSession> {
  const session = await (await createAuthProvider()).login({
    email: request.email,
    password: request.password,
    rememberMe: request.rememberMe ?? false,
  });
  await saveSession(session as StoredSession);
  return session;
}

export async function logoutFromApi(session: StoredSession): Promise<void> {
  void session;
  await (await createAuthProvider()).logout();
  await clearSession();
}

export async function logoutAllSessions(): Promise<void> {
  if (typeof window !== "undefined") {
    const setItem = window.localStorage?.setItem;
    if (typeof setItem === "function") {
      setItem.call(window.localStorage, "parkflow_just_logged_out", "true");
    }
  }
  await (await createAuthProvider()).logoutAll();
  await clearSession();
  clearRememberMeEmail();
}

export async function logoutDevice(deviceId: string): Promise<void> {
  await fetchWithCredentials(`${authBase()}/logout/device/${encodeURIComponent(deviceId)}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  clearRememberMeEmail();
}
