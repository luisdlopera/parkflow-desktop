"use client";
import { useState, useCallback } from "react";
import {
  cashMovements,
  cashSummary,
  cashAddMovement,
  cashVoidMovement,
  type CashMovementDto,
  type CashSummaryDto,
} from "@/lib/cash/cash-api";

export function useCajaMovements(sessionId: string | null) {
  const [movements, setMovements] = useState<CashMovementDto[]>([]);
  const [summary, setSummary] = useState<CashSummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [mv, sm] = await Promise.all([cashMovements(sessionId), cashSummary(sessionId)]);
      setMovements(mv);
      setSummary(sm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar movimientos");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const addMovement = useCallback(
    async (body: {
      type: string;
      paymentMethod: string;
      amount: number;
      reason?: string | null;
      idempotencyKey?: string | null;
    }, options?: { offline?: boolean }): Promise<CashMovementDto> => {
      if (!sessionId) throw new Error("No hay sesión de caja activa");
      const result = await cashAddMovement(sessionId, body, options);
      await load();
      return result;
    },
    [sessionId, load],
  );

  const voidMovement = useCallback(
    async (movementId: string, reason: string): Promise<CashMovementDto> => {
      if (!sessionId) throw new Error("No hay sesión de caja activa");
      const result = await cashVoidMovement(
        sessionId,
        movementId,
        reason,
        `void:${movementId}`,
      );
      await load();
      return result;
    },
    [sessionId, load],
  );

  return {
    movements,
    summary,
    loading,
    error,
    load,
    addMovement,
    voidMovement,
  };
}
