'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-default-200 bg-default-50 dark:bg-default-100 p-6 dark:border-default-200 dark:bg-default-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground dark:text-default-50">
            Error al cargar
          </h1>
        </div>

        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-400">
            {error.message || 'Ocurrió un error inesperado'}
          </p>
        </div>

        <button
          onClick={reset}
          className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-default-50 hover:bg-brand-600"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
