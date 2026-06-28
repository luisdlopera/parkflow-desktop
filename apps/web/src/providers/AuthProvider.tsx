'use client';

import React from 'react';
import { useSessionLoader } from '@/lib/hooks/use-session-loader';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading } = useSessionLoader();

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
