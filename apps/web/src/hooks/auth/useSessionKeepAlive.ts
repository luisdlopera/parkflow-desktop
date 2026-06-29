import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { clearSession } from '@/lib/services/auth-storage.service';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes - absolute logout if idle

export function useSessionKeepAlive() {
  const { isAuthenticated } = useAuthStore();
  const lastActivityRef = useRef<number>(Date.now());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // Refresh session - token is in httpOnly cookies, sent automatically
  const refreshSession = useCallback(async () => {
    if (!isAuthenticated || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    try {
      const response = await fetch('/api/v1/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: send cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, logout gracefully
          await clearSession();
          window.location.href = '/login?reason=session-expired';
        }
        isRefreshingRef.current = false;
        return;
      }

      // Success - session extended
      scheduleNextRefresh();
    } catch (error) {
      console.error('Error refreshing session:', error);
      // Silently fail - don't interrupt user experience
    } finally {
      isRefreshingRef.current = false;
    }
  }, [isAuthenticated]);

  // Schedule the next refresh
  const scheduleNextRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refreshSession();
    }, REFRESH_INTERVAL);
  }, [refreshSession]);

  // Record activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Reset idle timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Set new idle timeout - logout if no activity for 30 minutes
    activityTimeoutRef.current = setTimeout(async () => {
      console.log('Session idle timeout - logging out');
      await clearSession();
      window.location.href = '/login?reason=idle-timeout';
    }, IDLE_TIMEOUT);

    // Schedule refresh if not already scheduled
    if (!refreshTimeoutRef.current) {
      scheduleNextRefresh();
    }
  }, [scheduleNextRefresh]);

  // Setup event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial setup
    handleActivity();

    // Add event listeners
    const listeners = ACTIVITY_EVENTS.map(event => {
      window.addEventListener(event, handleActivity, true);
      return { event, handler: handleActivity };
    });

    // Cleanup
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
