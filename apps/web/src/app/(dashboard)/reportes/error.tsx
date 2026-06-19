"use client";

import { useEffect } from "react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";

export default function ReportesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en módulo de reportes:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="p-8 max-w-md text-center">
        <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error al cargar reportes</h2>
        <p className="text-slate-600 mb-6 text-sm">
          No pudimos procesar los datos analíticos en este momento. Por favor intente nuevamente.
        </p>
        <Button onClick={() => reset()} className="w-full bg-brand-600 text-white hover:bg-brand-700">
          Reintentar
        </Button>
      </Card>
    </div>
  );
}
