"use client";

import { useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { AlertTriangle } from "lucide-react";

export default function PlansError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Plans page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <AlertTriangle className="w-12 h-12 text-danger" />
      <h2 className="text-xl font-semibold">Error al cargar planes</h2>
      <p className="text-default-500 text-center max-w-md">
        Ocurrió un error al cargar el módulo de planes. Intente nuevamente.
      </p>
      <Button color="primary" onPress={reset}>
        Reintentar
      </Button>
    </div>
  );
}
