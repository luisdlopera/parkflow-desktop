"use client";

import { useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { AlertTriangle } from "lucide-react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Vehiculos Activos Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-6">
      <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-rose-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Algo salió mal</h2>
        <p className="text-default-600 max-w-md mx-auto">
          Ocurrió un error inesperado al intentar cargar la vista de vehículos activos. 
          Si el problema persiste, contacta a soporte técnico.
        </p>
      </div>
      <Button color="primary" onPress={() => reset()} size="lg">
        Reintentar carga
      </Button>
    </div>
  );
}
