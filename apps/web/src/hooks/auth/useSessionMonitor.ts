"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAuthProvider } from "@/auth/runtime/createAuthProvider";
import { useAuthStore } from "@/lib/stores/auth.store";

interface SessionMonitorState {
  isExpired: boolean;
  timeRemaining: number | null;
  isChecking: boolean;
}

export function useSessionMonitor() {
  const router = useRouter();
  const [state, setState] = useState<SessionMonitorState>({
    isExpired: false,
    timeRemaining: null,
    isChecking: true
  });

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const { user, isAuthenticated, isLoading } = useAuthStore.getState();

      if (isLoading) {
        setState(prev => ({ ...prev, isChecking: true }));
        return;
      }

      if (!isAuthenticated || !user) {
        setState({ isExpired: false, timeRemaining: null, isChecking: false });
        return;
      }

      const expiresAt = useAuthStore.getState().sessionExpiresAt;
      if (!expiresAt) {
        setState({ isExpired: false, timeRemaining: null, isChecking: false });
        return;
      }

      const exp = Date.parse(expiresAt);
      const remaining = Number.isFinite(exp) ? exp - Date.now() : Number.POSITIVE_INFINITY;

      if (remaining < 5 * 60 * 1000) {
        const authProvider = await createAuthProvider();
        const newSession = await authProvider.refresh();
        if (newSession?.expiresAt) {
          const newExp = Date.parse(newSession.expiresAt);
          const newRemaining = newExp - Date.now();
          if (newRemaining > 0) {
            useAuthStore.getState().setUser(newSession.user);
            if (newSession.permissions) {
              useAuthStore.getState().setPermissions(newSession.permissions);
            }
            useAuthStore.getState().setSessionExpiresAt(newSession.expiresAt);
            setState({ isExpired: false, timeRemaining: newRemaining, isChecking: false });
            return;
          }
        }

        useAuthStore.getState().logout();
        setState({ isExpired: true, timeRemaining: 0, isChecking: false });
        return;
      }

      setState({
        isExpired: remaining <= 0,
        timeRemaining: Math.max(0, remaining),
        isChecking: false
      });
    } catch {
      setState({
        isExpired: true,
        timeRemaining: 0,
        isChecking: false
      });
    }
  }, []);

  const renewSession = useCallback(async () => {
    try {
      const authProvider = await createAuthProvider();
      const session = await authProvider.refresh();
      if (!session) {
        throw new Error("No hay sesión activa");
      }
      useAuthStore.getState().setUser(session.user);
      if (session.permissions) {
        useAuthStore.getState().setPermissions(session.permissions);
      }
      if (session.expiresAt) {
        useAuthStore.getState().setSessionExpiresAt(session.expiresAt);
      }
      await checkSession();
    } catch (error) {
      throw error;
    }
  }, [checkSession]);

  const forceLogout = useCallback(async () => {
    await (await createAuthProvider()).logout();
    useAuthStore.getState().logout();
    setState({ isExpired: true, timeRemaining: 0, isChecking: false });
    router.push(`/login?reason=expired&next=${encodeURIComponent(window.location.pathname)}`);
  }, [router]);

  // Periodic check
  useEffect(() => {
    checkSession();

    checkIntervalRef.current = setInterval(checkSession, 60000);

    let debounceTimer: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          checkSession();
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkSession]);

  return {
    ...state,
    checkSession,
    renewSession,
    forceLogout
  };
}

export function useAuthErrorCheck() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?reason=token_refresh_failed");
    }
  }, [isAuthenticated, router]);
}
