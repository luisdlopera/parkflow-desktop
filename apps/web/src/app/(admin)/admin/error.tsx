"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="mb-6 rounded-full bg-danger-50 p-4 text-danger">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Error en el panel de administración</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        {error.message || "No se pudo cargar esta sección. Intenta de nuevo."}
      </p>
      <Button onClick={reset} variant="outline">
        Reintentar
      </Button>
    </div>
  );
}
