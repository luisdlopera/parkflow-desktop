'use client';

import React from 'react';
import { useSessionLoader } from '@/lib/hooks/use-session-loader';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading } = useSessionLoader();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-default-50 dark:bg-default-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-default-600 border-t-transparent" />
          <p className="text-sm font-medium text-default-500">Restaurando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
