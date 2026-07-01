import { createAuthProvider } from "@/auth/runtime/createAuthProvider";
import { clearSession } from "@/lib/services/auth-storage.service";
import { useAuthStore } from "@/lib/stores/auth.store";

export async function refreshSessionState(): Promise<ReturnType<typeof useAuthStore.getState> | null> {
  const authProvider = await createAuthProvider();
  const refreshed = await authProvider.refresh();

  if (!refreshed) {
    await authProvider.logout();
    await clearSession();
    useAuthStore.getState().logout();
    return null;
  }

  useAuthStore.getState().setUser(refreshed.user);
  if (refreshed.permissions) {
    useAuthStore.getState().setPermissions(refreshed.permissions);
  }
  if (refreshed.expiresAt) {
    useAuthStore.getState().setSessionExpiresAt(refreshed.expiresAt);
  }

  return useAuthStore.getState();
}

export async function logoutSessionState(): Promise<void> {
  const authProvider = await createAuthProvider();
  await authProvider.logout();
  await clearSession();
  useAuthStore.getState().logout();
}
