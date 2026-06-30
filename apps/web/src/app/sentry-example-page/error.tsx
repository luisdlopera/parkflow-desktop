"use client";

import { useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { AlertTriangle } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-6">
      <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-rose-600" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Error al cargar la página</h2>
        <p className="text-default-600 max-w-md mx-auto">
          {error.message || "Intenta recargar la página"}
        </p>
      </div>
      <Button color="primary" onPress={() => reset()} size="lg">
        Reintentar
      </Button>
    </div>
  );
}
