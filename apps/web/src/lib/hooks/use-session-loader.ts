import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { createAuthProvider } from '@/auth/runtime/createAuthProvider';
import { safeStorage } from '@/lib/utils/storage';

export function useSessionLoader() {
  const { setUser, setSessionExpiresAt, isLoading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 2;

    const doRestore = async () => {
      // Check if we just logged out — don't attempt to restore session
      const justLoggedOut = typeof window !== 'undefined' && safeStorage.getItem('parkflow_just_logged_out');
      if (justLoggedOut) {
        console.log('[useSessionLoader] Just logged out, skipping session restore');
        safeStorage.removeItem('parkflow_just_logged_out');
        setUser(null);
        return;
      }

      try {
        const session = await (await createAuthProvider()).restoreSession();
        if (!session) {
          console.log('[useSessionLoader] No valid session, clearing user');
          setUser(null);
          return;
        }

        console.log('[useSessionLoader] Session restored successfully:', {
          email: session.user?.email,
          role: session.user?.role,
        });

        setUser(session.user);
        
        if (session.expiresAt) {
          setSessionExpiresAt(session.expiresAt);
        }
      } catch (error) {
        console.error('[useSessionLoader] Error during restore:', error);
        if (retryCount < maxRetries && initialized.current) {
          retryCount++;
          console.log(`[useSessionLoader] Retrying restore-session (attempt ${retryCount}/${maxRetries})`);
          timeoutId = setTimeout(doRestore, retryCount * 1000);
        } else {
          console.log('[useSessionLoader] Max retries exceeded, clearing user');
          timeoutId = setTimeout(() => {
            setUser(null);
          }, 3_000);
        }
      }
    };

    void doRestore();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [setUser, setSessionExpiresAt]);

  // Listen for logout events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'parkflow_just_logged_out' && e.newValue === 'true') {
        console.log('[useSessionLoader] Logout detected from another tab');
        setUser(null);
        safeStorage.removeItem('parkflow_just_logged_out');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setUser]);

  return { isLoading };
}
