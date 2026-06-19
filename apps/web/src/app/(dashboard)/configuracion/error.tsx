"use client";

import { useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { AlertCircle } from "lucide-react";

export default function ConfiguracionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ConfiguracionError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
      <div className="mb-4 rounded-full bg-danger-50 p-3 text-danger">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Error al cargar la configuración</h2>
      <p className="text-sm text-slate-500 mb-4 max-w-sm">
        {error.message || "No se pudo cargar esta sección."}
      </p>
      <Button onClick={reset} size="sm" variant="outline">
        Reintentar
      </Button>
    </div>
  );
}
