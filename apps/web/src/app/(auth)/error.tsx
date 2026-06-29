'use client';

import { Button } from '@/components/bridge/Button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4 sm:px-6 py-10">
      <form className="surface w-full space-y-6 rounded-[2rem] p-6 sm:p-8 md:p-10 border border-default-200 dark:border-default-200 bg-default-50 dark:bg-default-100 dark:bg-default-100">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-700/80 mb-2">
            Parkflow
          </p>
          <h1 className="text-3xl font-black text-foreground dark:text-default-50 tracking-tight">
            Algo salió mal
          </h1>
        </div>

        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
          <p className="text-sm text-danger font-medium mb-2">Error de conexión</p>
          <p className="text-xs text-danger/80">
            {error.message || 'No pudimos conectar con el servidor. Por favor, intenta de nuevo.'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={reset}
            color="primary"
            size="lg"
            className="flex-1 font-bold"
            type="button"
          >
            Reintentar
          </Button>
          <Button
            href="/"
            as="a"
            variant="bordered"
            size="lg"
            className="flex-1 font-bold"
          >
            Volver al inicio
          </Button>
        </div>

        <p className="text-center text-[10px] font-bold text-default-400 uppercase tracking-widest pt-2">
          &copy; 2026 ParkFlow Operations. v2.0
        </p>
      </form>
    </main>
  );
}
