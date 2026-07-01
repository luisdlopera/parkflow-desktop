"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { refreshSessionState, logoutSessionState } from "./session-refresh";

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
        const newSession = await refreshSessionState();
        if (newSession?.sessionExpiresAt) {
          const newExp = Date.parse(newSession.sessionExpiresAt);
          const newRemaining = newExp - Date.now();
          if (newRemaining > 0) {
            setState({ isExpired: false, timeRemaining: newRemaining, isChecking: false });
            return;
          }
        }
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
    const session = await refreshSessionState();
    if (!session) {
      throw new Error("No hay sesión activa");
    }
    await checkSession();
  }, [checkSession]);

  const forceLogout = useCallback(async () => {
    await logoutSessionState();
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
