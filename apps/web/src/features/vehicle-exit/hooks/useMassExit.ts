"use client";

import { useState } from "react";
import { currentUser } from "@/lib/services/auth-domain.service";
import { useAsyncAction } from "@/lib/errors/use-async-action";
import { FrontendActionError } from "@/lib/errors/error-messages";
import {
  previewMassExit,
  processMassExit,
  ChargeMode,
  MassExitFilterRequestDto,
  MassExitPreviewResponseDto,
  MassExitResponseDto,
} from "@/lib/api/mass-exit-api";

export type MassExitStep = "filters" | "confirm" | "result";

export type MassExitFilters = {
  vehicleTypeCode: string;
  siteCode: string;
  entryFrom: string;
  entryTo: string;
};

export function useMassExit() {
  const [step, setStep] = useState<MassExitStep>("filters");
  const [filters, setFilters] = useState<MassExitFilters>({
    vehicleTypeCode: "",
    siteCode: "",
    entryFrom: "",
    entryTo: "",
  });
  const [chargeMode, setChargeMode] = useState<ChargeMode>("NORMAL");
  const [customAmount, setCustomAmount] = useState<number | undefined>();
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [selectedLocators, setSelectedLocators] = useState<string[] | undefined>();
  const [preview, setPreview] = useState<MassExitPreviewResponseDto | null>(null);
  const [result, setResult] = useState<MassExitResponseDto | null>(null);

  const {
    run: runPreview,
    isLoading: isPreviewing,
    error: previewError,
  } = useAsyncAction<MassExitPreviewResponseDto>({
    errorContext: FrontendActionError.LOAD_DATA,
    showErrorToast: true,
    onSuccess: (data) => {
      setPreview(data);
      setStep("confirm");
    },
  });

  const {
    run: runProcess,
    isLoading: isProcessing,
    error: processError,
  } = useAsyncAction<MassExitResponseDto>({
    errorContext: FrontendActionError.SAVE_DATA,
    showErrorToast: true,
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
    },
  });

  const handlePreview = async () => {
    const user = await currentUser();
    if (!user) return;
    await runPreview(() => previewMassExit(buildRequest(user.id)));
  };

  const handleConfirm = async () => {
    const user = await currentUser();
    if (!user) return;
    await runProcess(() => processMassExit(buildRequest(user.id)));
  };

  const buildRequest = (operatorUserId: string): MassExitFilterRequestDto => ({
    chargeMode,
    customAmount: chargeMode === "CUSTOM" ? customAmount : undefined,
    reason,
    vehicleTypeCode: filters.vehicleTypeCode || undefined,
    siteCode: filters.siteCode || undefined,
    entryFrom: filters.entryFrom || undefined,
    entryTo: filters.entryTo || undefined,
    selectedLocators,
    operatorUserId,
    paymentMethod: chargeMode === "FREE" ? undefined : paymentMethod,
  });

  const reset = () => {
    setStep("filters");
    setPreview(null);
    setResult(null);
    setReason("");
    setSelectedLocators(undefined);
    setChargeMode("NORMAL");
    setCustomAmount(undefined);
  };

  return {
    step,
    filters,
    setFilters,
    chargeMode,
    setChargeMode,
    customAmount,
    setCustomAmount,
    reason,
    setReason,
    paymentMethod,
    setPaymentMethod,
    selectedLocators,
    setSelectedLocators,
    preview,
    result,
    isPreviewing,
    isProcessing,
    previewError,
    processError,
    handlePreview,
    handleConfirm,
    reset,
  };
}

export type UseMassExitReturn = ReturnType<typeof useMassExit>;
