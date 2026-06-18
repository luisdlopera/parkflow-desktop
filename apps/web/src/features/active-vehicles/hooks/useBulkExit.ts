"use client";
import { useState } from "react";
import { currentUser } from "@/lib/auth";
import { precalculateBulkExit, processBulkExit, BulkExitCalculateResponseDto, BulkExitResponseDto } from "@/services/bulk-exit.service";
import type { ActiveSessionDto } from "@/services/sessions.service";
import type { Selection } from "@heroui/react";

export function useBulkExit(rows: ActiveSessionDto[], reload: () => void) {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [precalculation, setPrecalculation] = useState<BulkExitCalculateResponseDto | null>(null);
  const [finalResult, setFinalResult] = useState<BulkExitResponseDto | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    } catch (err: any) {
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
      const result = await processBulkExit({ locators, operatorUserId: user.id, paymentMethod: "CASH" });
      setFinalResult(result);
      setSelectedKeys(new Set());
      reload();
    } catch (err: any) {
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
    handleCalculate, handleConfirm, closeModal,
  };
}
