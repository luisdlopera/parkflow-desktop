import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { saveSession } from '@/lib/services/auth-storage.service';
import { authBase } from '@/lib/api/config';
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials';

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
      try {
        const response = await fetchWithCredentials(`${authBase()}/restore-session`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          // Non-200 response means no valid session (401/403/etc) — don't retry
          setUser(null);
          return;
        }
        const payload = await response.json();
        await saveSession({
          user: payload.user,
          session: payload.session,
          offlineLease: payload.offlineLease,
        });
        setUser(payload.user);
        // Keep session expiry in store so useSessionMonitor can read it without loadSession()
        if (payload.session?.accessTokenExpiresAtIso) {
          setSessionExpiresAt(payload.session.accessTokenExpiresAtIso);
        }
      } catch {
        // Network error: retry up to maxRetries times before forcing logout
        if (retryCount < maxRetries && initialized.current) {
          retryCount++;
          timeoutId = setTimeout(doRestore, retryCount * 1000);
        } else {
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

  return { isLoading };
}
