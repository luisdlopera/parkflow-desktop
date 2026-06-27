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
      <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
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
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
