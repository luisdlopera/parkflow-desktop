import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { clearSession } from '@/lib/services/auth-storage.service';
import { createAuthProvider } from '@/auth/runtime/createAuthProvider';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSessionKeepAlive() {
  const { isAuthenticated } = useAuthStore();
  const lastActivityRef = useRef<number>(0);
  if (lastActivityRef.current === 0) {
    lastActivityRef.current = Date.now();
  }
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const scheduleNextRefreshRef = useRef<() => void>(() => {});

  const refreshSession = useCallback(async () => {
    if (!isAuthenticated || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    try {
      const authProvider = await createAuthProvider();
      const refreshed = await authProvider.refresh();
      if (!refreshed) {
        await authProvider.logout();
        await clearSession();
        useAuthStore.getState().logout();
        window.location.href = '/login?reason=expired';
        return;
      }
      scheduleNextRefreshRef.current();
    } catch {
      // Silently fail - don't interrupt user experience
    } finally {
      isRefreshingRef.current = false;
    }
  }, [isAuthenticated]);

  const scheduleNextRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refreshSession();
    }, REFRESH_INTERVAL);
  }, [refreshSession]);

  scheduleNextRefreshRef.current = scheduleNextRefresh;

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(async () => {
      console.log('Session idle timeout - logging out');
      const authProvider = await createAuthProvider();
      await authProvider.logout();
      await clearSession();
      useAuthStore.getState().logout();
      window.location.href = '/login?reason=expired';
    }, IDLE_TIMEOUT);

    if (!refreshTimeoutRef.current) {
      scheduleNextRefresh();
    }
  }, [scheduleNextRefresh]);

  useEffect(() => {
    if (!isAuthenticated) return;

    handleActivity();

    const listeners = ACTIVITY_EVENTS.map(event => {
      window.addEventListener(event, handleActivity, true);
      return { event, handler: handleActivity };
    });

    return () => {
      listeners.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler, true);
      });

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [isAuthenticated, handleActivity]);

  return { lastActivity: lastActivityRef.current };
}
