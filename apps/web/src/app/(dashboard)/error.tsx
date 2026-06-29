"use client";

import { useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="mb-6 rounded-full bg-danger-50 p-4 text-danger">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Ocurrió un error inesperado</h2>
      <p className="text-sm text-default-500 mb-6 max-w-sm">
        {error.message || "No se pudo cargar esta sección. Intenta de nuevo."}
      </p>
      <Button onClick={reset} variant="outline">
        Reintentar
      </Button>
    </div>
  );
}
