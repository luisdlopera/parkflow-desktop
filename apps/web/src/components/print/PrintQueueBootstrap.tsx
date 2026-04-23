"use client";

import { useEffect } from "react";
import { startLocalPrintQueueWorker } from "@/lib/print/print-service";

/**
 * Inicia reintentos y vaciado de la cola local de impresión (navegador + IndexedDB).
 */
export default function PrintQueueBootstrap() {
  useEffect(() => {
    startLocalPrintQueueWorker();
  }, []);
  return null;
}
