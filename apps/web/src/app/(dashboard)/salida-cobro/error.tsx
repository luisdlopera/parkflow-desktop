"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Salida Cobro Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-6">
      <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-rose-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Error procesando salida</h2>
        <p className="text-slate-600 max-w-md mx-auto">
          Tuvimos un problema cargando los datos para la liquidación. Verifica tu conexión e intenta de nuevo.
        </p>
      </div>
      <Button color="primary" onPress={() => reset()} size="lg">
        Reintentar carga
      </Button>
    </div>
  );
}
