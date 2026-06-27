"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { refreshIfNeeded } from "@/features/auth/api/auth.api";
import { loadSession, clearSession } from "@/lib/services/auth-storage.service";
import { useAuthStore } from "@/lib/stores/auth.store";
interface SessionMonitorState {
  isExpired: boolean;
  timeRemaining: number | null;
  isChecking: boolean;
}

/**
 * Hook para monitorear el estado de la sesión
 * Detecta cuando la sesión está por expirar o ya expiró
 */
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
      const { isLoading } = useAuthStore.getState();
      if (isLoading) {
        setState(prev => ({ ...prev, isChecking: true }));
        return;
      }

      const session = await loadSession();

      if (!session) {
        setState({ isExpired: true, timeRemaining: 0, isChecking: false });
        return;
      }

      const exp = Date.parse(session.session.accessTokenExpiresAtIso);
      const now = Date.now();
      const remaining = exp - now;

      // Si ya expiró
      if (remaining <= 0) {
        await clearSession();
        setState({ isExpired: true, timeRemaining: 0, isChecking: false });
        return;
      }

      // Si expira en menos de 5 minutos, intentar refrescar automáticamente
      if (remaining < 5 * 60 * 1000) {
        try {
          await refreshIfNeeded(session);
          // Recalcular después del refresh
          const newSession = await loadSession();
          if (newSession) {
            const newExp = Date.parse(newSession.session.accessTokenExpiresAtIso);
            setState({
              isExpired: false,
              timeRemaining: newExp - Date.now(),
              isChecking: false
            });
          }
        } catch {
          // Si falla el refresh, mostrar modal
          setState({
            isExpired: true,
            timeRemaining: remaining,
            isChecking: false
          });
        }
      } else {
        setState({
          isExpired: false,
          timeRemaining: remaining,
          isChecking: false
        });
      }
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
      const session = await loadSession();
      if (!session) {
        throw new Error("No hay sesión activa");
      }
      await refreshIfNeeded(session);
      await checkSession();
    } catch (error) {
      throw error;
    }
  }, [checkSession]);

  const forceLogout = useCallback(async () => {
    await clearSession();
    setState({ isExpired: true, timeRemaining: 0, isChecking: false });
    router.push("/login?expired=1");
  }, [router]);

  // Verificar periódicamente
  useEffect(() => {
    checkSession();

    // Verificar cada minuto
    checkIntervalRef.current = setInterval(checkSession, 60000);

    // También verificar cuando la ventana recupera foco con debounce de 500ms
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
