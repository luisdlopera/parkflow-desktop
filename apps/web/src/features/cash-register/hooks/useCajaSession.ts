"use client";
import { useState, useCallback, useEffect } from "react";
import {
  cashPolicy,
  cashCurrent,
  cashOpen,
  cashClose,
  cashCount,
  type CashSessionDto,
  type CashPolicyDto,
} from "@/lib/cash/cash-api";
import { useCashRegisterStore } from "@/lib/stores/cash-register.store";

export function useCajaSession(site: string, terminal: string) {
  const setStoreSession = useCashRegisterStore((s) => s.setSession);
  const setStorePolicy = useCashRegisterStore((s) => s.setPolicy);
  const clearStoreSession = useCashRegisterStore((s) => s.clearSession);

  const [session, setSession] = useState<CashSessionDto | null>(null);
  const [policy, setPolicy] = useState<CashPolicyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!terminal) return;
    setLoading(true);
    setError(null);
    try {
      const s = await cashCurrent(site || undefined, terminal || undefined);
      setSession(s);
      setStoreSession(s);
    } catch (err) {
      setSession(null);
      setStoreSession(null);
      const msg = err instanceof Error ? err.message : "Error al cargar sesión";
      if (!msg.includes("404") && !msg.includes("No active")) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [site, terminal, setStoreSession]);

  const loadPolicy = useCallback(async () => {
    try {
      const p = await cashPolicy(site || undefined);
      setPolicy(p);
      setStorePolicy(p);
    } catch {
      setPolicy(null);
    }
  }, [site, setStorePolicy]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  useEffect(() => {
    if (terminal) loadSession();
  }, [loadSession, terminal]);

  const openSession = useCallback(
    async (params: {
      openingAmount: number;
      operatorUserId: string;
      notes?: string | null;
    }) => {
      const result = await cashOpen({
        site: site || "default",
        terminal,
        openingAmount: params.openingAmount,
        operatorUserId: params.operatorUserId,
        openIdempotencyKey: `open:${terminal}:${Date.now()}`,
        notes: params.notes,
      });
      setSession(result);
      setStoreSession(result);
      return result;
    },
    [site, terminal, setStoreSession],
  );

  const countSession = useCallback(
    async (body: {
      countCash: number;
      countCard: number;
      countTransfer: number;
      countOther: number;
      observations?: string | null;
    }) => {
      if (!session) throw new Error("No hay sesión activa");
      const result = await cashCount(session.id, body);
      setSession(result);
      setStoreSession(result);
      return result;
    },
    [session, setStoreSession],
  );

  const closeSession = useCallback(
    async (body: {
      closingNotes?: string | null;
      closingWitnessName?: string | null;
    }) => {
      if (!session) throw new Error("No hay sesión activa");
      const result = await cashClose(session.id, {
        ...body,
        closeIdempotencyKey: `close:${session.id}:${Date.now()}`,
      });
      setSession(result);
      setStoreSession(result);
      return result;
    },
    [session, setStoreSession],
  );

  const clearSession = useCallback(() => {
    setSession(null);
    clearStoreSession();
  }, [clearStoreSession]);

  return {
    session,
    policy,
    loading,
    error,
    isOpen: session?.status === "OPEN",
    reload: loadSession,
    openSession,
    countSession,
    closeSession,
    clearSession,
    setError,
  };
}
