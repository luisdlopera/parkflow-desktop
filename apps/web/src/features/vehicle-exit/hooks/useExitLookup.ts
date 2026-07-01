"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { lookupActiveSession } from "../services/vehicle-exit.service";
import { useOperationSounds } from "@/hooks/ui/useOperationSounds";
import { errorService } from "@/lib/errors/error-service";
import type { ActiveLookup, CustodiedItemInfo } from "../types";
import type { PaymentMethodCode } from "@/lib/payment-method-catalog";

export function useExitLookup(availablePaymentMethods: Array<{ code: PaymentMethodCode; label: string; hint: string; tone: string }>, resetSplitPayment: (first: Exclude<PaymentMethodCode, "MIXED">, second: Exclude<PaymentMethodCode, "MIXED">) => void) {
  const searchParams = useSearchParams();
  const initialTicketNumber = searchParams?.get("ticketNumber")?.trim() ?? "";
  const initialPlate = searchParams?.get("plate")?.trim().toUpperCase() ?? "";

  const { playSuccess, playError } = useOperationSounds();

  const [ticketNumber, setTicketNumber] = useState("");
  const [plate, setPlate] = useState("");
  const [agreementCode, setAgreementCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState<ActiveLookup | null>(null);
  const [pendingCustodiedItems, setPendingCustodiedItems] = useState<CustodiedItemInfo[]>([]);
  const [returnConfirmedIds, setReturnConfirmedIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const ticketInputRef = useRef<HTMLInputElement>(null);
  const autoLookupDone = useRef(false);

  useEffect(() => {
    setTimeout(() => ticketInputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (initialTicketNumber) setTicketNumber(initialTicketNumber);
    if (initialPlate) setPlate(initialPlate);
  }, [initialTicketNumber, initialPlate]);

  const resetLookup = useCallback(() => {
    setActive(null);
    setTicketNumber("");
    setPlate("");
    setAgreementCode("");
    setTimeout(() => ticketInputRef.current?.focus(), 100);
  }, []);

  const lookup = useCallback(async (override?: { ticketNumber?: string; plate?: string }) => {
    setError("");
    const currentTicket = override?.ticketNumber ?? ticketNumber;
    const currentPlate = override?.plate ?? plate;
    const locator = currentTicket.trim() || currentPlate.trim();
    if (!locator) { setError("Ingresa ticket o placa"); return; }

    setSearching(true);
    try {
      const payload = await lookupActiveSession(
        currentTicket.trim(),
        currentPlate.trim().toUpperCase(),
        agreementCode.trim() || undefined,
      );
      setActive(payload);
      const availableNonMixed = availablePaymentMethods.filter((m) => m.code !== "MIXED") as Array<{ code: Exclude<PaymentMethodCode, "MIXED">; label: string; hint: string; tone: string }>;
      resetSplitPayment(availableNonMixed[0]?.code ?? "CASH", availableNonMixed[1]?.code ?? availableNonMixed[0]?.code ?? "CASH");
      if (payload.receipt.agreementCode) setAgreementCode(payload.receipt.agreementCode);
      const pending = ((payload.receipt.custodiedItems ?? []) as CustodiedItemInfo[]).filter((item) => item.status === "RECEIVED");
      setPendingCustodiedItems(pending);
      setReturnConfirmedIds(pending.map((item) => item.id));
      playSuccess();
    } catch (err) {
      setActive(null);
      setError(errorService.normalize(err).message);
      playError();
    } finally {
      setSearching(false);
    }
  }, [ticketNumber, plate, agreementCode, availablePaymentMethods, resetSplitPayment, playSuccess, playError]);

  useEffect(() => {
    if (autoLookupDone.current || (!initialTicketNumber && !initialPlate)) return;
    autoLookupDone.current = true;
    void lookup({ ticketNumber: initialTicketNumber, plate: initialPlate });
  }, [initialPlate, initialTicketNumber, lookup]);

  const toggleReturnItem = useCallback((id: string, checked: boolean) => {
    setReturnConfirmedIds((prev) => checked ? [...prev, id] : prev.filter((i) => i !== id));
  }, []);

  return {
    ticketNumber, setTicketNumber,
    plate, setPlate,
    agreementCode, setAgreementCode,
    searching,
    active, setActive,
    pendingCustodiedItems,
    returnConfirmedIds,
    error, setError,
    ticketInputRef,
    resetLookup,
    lookup,
    toggleReturnItem,
  };
}
