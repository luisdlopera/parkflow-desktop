"use client";
import { useState } from "react";
import { currentUser } from "@/features/auth/services/auth-domain.service";
import { precalculateBulkExit, processBulkExit, BulkExitCalculateResponseDto, BulkExitResponseDto } from "@/lib/api/bulk-exit-api";
import type { ActiveSessionDto } from "@/lib/api/sessions-api";
import type { Selection } from "@heroui/react";
import useSWR from "swr";
import { fetchConfigurationPaymentMethods } from "@/lib/settings-api";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";
import { useMemo } from "react";

export function useBulkExit(rows: ActiveSessionDto[], reload: () => void) {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [precalculation, setPrecalculation] = useState<BulkExitCalculateResponseDto | null>(null);
  const [finalResult, setFinalResult] = useState<BulkExitResponseDto | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { hasPaymentMethod } = useRuntimeConfig();
  const { data: dbMethodsData, isLoading: methodsLoading } = useSWR(
    "active-payment-methods",
    () => fetchConfigurationPaymentMethods({ active: true, size: 50 }),
    { revalidateOnFocus: false }
  );

  const availablePaymentMethods = useMemo(() => {
    if (methodsLoading || !dbMethodsData) return [];
    return dbMethodsData.content
      .filter((m) => hasPaymentMethod(m.code))
      .map((m) => ({ code: m.code, label: m.name }));
  }, [dbMethodsData, methodsLoading, hasPaymentMethod]);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("CASH");

  const hasSelection =
    (selectedKeys === "all" && rows.length > 0) ||
    (selectedKeys !== "all" && (selectedKeys as Set<string>).size > 0);

  const selectionCount =
    selectedKeys === "all" ? rows.length : (selectedKeys as Set<string>).size;

  const handleCalculate = async () => {
    const user = await currentUser();
    if (!user) return;
    const locators =
      selectedKeys === "all" ? rows.map((r) => r.ticketNumber) : Array.from(selectedKeys);
    if (locators.length === 0) return;

    setIsCalculating(true);
    try {
      const result = await precalculateBulkExit({ locators: locators as string[], operatorUserId: user.id });
      setPrecalculation(result);
    } catch (err: unknown) {
      alert("Error en pre-liquidación: " + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleConfirm = async () => {
    const user = await currentUser();
    if (!user || !precalculation) return;
    const locators = precalculation.items.map((i) => i.locator);

    setIsProcessing(true);
    try {
      const result = await processBulkExit({ locators, operatorUserId: user.id, paymentMethod: selectedPaymentMethod });
      setFinalResult(result);
      setSelectedKeys(new Set());
      reload();
    } catch (err: unknown) {
      alert("Error procesando salida masiva: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => { setPrecalculation(null); setFinalResult(null); };

  return {
    selectedKeys, setSelectedKeys,
    precalculation, finalResult,
    isCalculating, isProcessing,
    hasSelection, selectionCount,
    availablePaymentMethods, selectedPaymentMethod, setSelectedPaymentMethod,
    handleCalculate, handleConfirm, closeModal,
  };
}
