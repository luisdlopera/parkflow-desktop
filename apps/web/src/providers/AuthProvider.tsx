'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { saveSession } from '@/lib/services/auth-storage.service';
import { authBase } from '@/lib/api/config';
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, isLoading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const timeoutId = setTimeout(() => {
      setUser(null);
    }, 3_000);

    (async () => {
      try {
        const response = await fetchWithCredentials(`${authBase()}/restore-session`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
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
      } catch {
        setUser(null);
      } finally {
        clearTimeout(timeoutId);
      }
    })();
  }, [setUser]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Restaurando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
