"use client";
import { useState, useCallback } from "react";
import { newIdempotencyKey } from "@/lib/idempotency";
import { downloadTicketAsHtml } from "@/lib/print/ticket-download";
import { currentUser } from "@/features/auth/services/auth-domain.service";
import { reprintEntryTicket } from "../services/vehicle-entry.service";

export interface PrintWarning {
  ticketNumber: string;
  plate: string;
  previewLines: string[];
}

export function useEntryPrinting() {
  const [printWarning, setPrintWarning] = useState<PrintWarning | null>(null);
  const [reprintLoading, setReprintLoading] = useState(false);

  const showPrintWarning = useCallback((warning: PrintWarning) => {
    setPrintWarning(warning);
  }, []);

  const clearPrintWarning = useCallback(() => {
    setPrintWarning(null);
  }, []);

  const handleDownload = useCallback(() => {
    if (!printWarning) return;
    downloadTicketAsHtml(
      printWarning.previewLines,
      printWarning.ticketNumber,
      printWarning.plate,
    );
  }, [printWarning]);

  const handleReprint = useCallback(
    async (onSuccess: (msg: string) => void, onError: (msg: string) => void) => {
      if (!printWarning) return;
      setReprintLoading(true);
      try {
        const user = await currentUser();
        const response = await reprintEntryTicket(
          printWarning.ticketNumber,
          user?.id ?? "00000000-0000-0000-0000-000000000003",
          newIdempotencyKey(),
        );
        if (!response.ok) {
          const text = await response.text().catch(() => null);
          throw new Error(text || `Error ${response.status}`);
        }
        onSuccess("Solicitud de reimpresion enviada");
        setPrintWarning(null);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Error al reimprimir");
      } finally {
        setReprintLoading(false);
      }
    },
    [printWarning],
  );

  return {
    printWarning,
    reprintLoading,
    showPrintWarning,
    clearPrintWarning,
    handleDownload,
    handleReprint,
  };
}
