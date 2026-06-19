"use client";
import { useRef, useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  newIdempotencyKey,
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
} from "@/lib/idempotency";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import {
  buildTicketPreviewForOperation,
  printReceiptIfTauri,
} from "@/lib/tauri-print";
import { normalizeApiError } from "@/lib/errors/normalize-api-error";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { normalizePlate, inferVehicleType } from "@/lib/validation/plate-validator";
import { toUserMessageFromClientValidation } from "@/lib/validation/request-guard";
import { currentUser } from "@/lib/auth";
import type { VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import type { VehicleType } from "@parkflow/types";
import { createParkingEntry } from "@/features/vehicle-entry/services/vehicle-entry.service";
import type { OperatorSettings } from "./useOperatorSettings";

interface UseVehicleEntryOptions {
  form: UseFormReturn<VehicleEntryFormValues>;
  settings: OperatorSettings;
  occupancy: { availableSpaces: number; activeSpaces: number } | null;
  isMotorcycleOnly: boolean;
  onSuccess: (result: {
    ticketNumber: string;
    plate: string;
    previewLines: string[];
    printWarning: string | null;
    spaceCode?: string;
  }) => void;
  onError: (msg: string) => void;
  onOfflineQueued: () => void;
  onIncrementStats: () => void;
  onReloadOccupancy: () => void;
  clearAutoSave: () => void;
}

function resolveVehicleType(type: string, countryCode: string, plate: string): VehicleType {
  if (!type || type === "CAR" || type === "OTHER") {
    const inferred = inferVehicleType(countryCode, plate);
    if (inferred) return inferred as VehicleType;
  }
  return type as VehicleType;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("connection") ||
      msg.includes("offline")
    );
  }
  return false;
}

function extractValidationError(apiError: any, defaultMsg: string): string {
  if (apiError.code === "VALIDATION_ERROR" && apiError.details) {
    if (Array.isArray(apiError.details) && apiError.details.length > 0) {
      return (apiError.details[0] as any).message || defaultMsg;
    }
    if (typeof apiError.details === "object") {
      const details = apiError.details as Record<string, unknown>;
      const firstKey = Object.keys(details)[0];
      if (firstKey) return `${firstKey}: ${details[firstKey]}`;
    }
  }
  return defaultMsg;
}

function buildFormResetValues(
  values: VehicleEntryFormValues,
  settings: OperatorSettings,
  isMotorcycleOnly: boolean,
): Partial<VehicleEntryFormValues> {
  return {
    plate: "",
    type: isMotorcycleOnly ? "MOTORCYCLE" : settings.defaultVehicleType,
    countryCode: values.countryCode || "CO",
    entryMode: "VISITOR",
    noPlate: false,
    noPlateReason: "",
    rateId: "",
    site: settings.rememberLocation ? values.site : "Principal",
    lane: settings.rememberLocation ? values.lane : "",
    booth: settings.rememberLocation ? values.booth : "",
    terminal: settings.rememberLocation ? values.terminal : "",
    observations: "",
    vehicleCondition: settings.skipConditionCheck ? "" : "Sin novedades al ingreso",
    conditionChecklist: "",
    conditionPhotoUrls: "",
    custodiedItems: [],
  };
}

export function useVehicleEntry({
  form,
  settings,
  occupancy,
  isMotorcycleOnly,
  onSuccess,
  onError,
  onOfflineQueued,
  onIncrementStats,
  onReloadOccupancy,
  clearAutoSave,
}: UseVehicleEntryOptions) {
  const submitLock = useRef(false);
  const idempotencyKeyRef = useRef(newIdempotencyKey());

  const submit = useCallback(
    async (values: VehicleEntryFormValues) => {
      if (submitLock.current) return;
      submitLock.current = true;

      if (occupancy !== null && occupancy.availableSpaces <= 0) {
        onError("No hay celdas disponibles para este negocio.");
        submitLock.current = false;
        return;
      }

      clearAutoSave();

      const normalizedPlate = values.noPlate
        ? `NP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        : normalizePlate(values.plate);

      const idempotencyFingerprint = JSON.stringify({
        plate: normalizedPlate ?? "",
        type: values.type,
        site: values.site ?? "",
        terminal: values.terminal ?? "",
        entryMode: values.entryMode ?? "",
      });

      try {
        const user = await currentUser();
        if (!user?.id) {
          onError("Sesion requerida para registrar ingresos");
          return;
        }

        const idempotencyKey = getOrCreateIdempotencyKey("entry", idempotencyFingerprint);
        idempotencyKeyRef.current = idempotencyKey;

        const resolvedType = resolveVehicleType(
          values.type,
          values.countryCode,
          values.plate,
        );

        const response = await createParkingEntry({
          idempotencyKey,
          operatorUserId: user.id,
          ...values,
          type: resolvedType,
          plate: normalizedPlate,
          noPlateReason: values.noPlate ? values.noPlateReason?.trim() : null,
          rateId: values.rateId?.trim() || null,
          site: values.site?.trim() || null,
          lane: values.lane?.trim() || null,
          booth: values.booth?.trim() || null,
          terminal: values.terminal?.trim() || null,
          observations: values.observations?.trim() || null,
          vehicleCondition:
            settings.skipConditionCheck && !values.vehicleCondition?.trim()
              ? "Sin novedades"
              : values.vehicleCondition.trim(),
          conditionChecklist: values.conditionChecklist
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean),
          conditionPhotoUrls: values.conditionPhotoUrls
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean),
          custodiedItems:
            values.custodiedItems?.map((item) => ({
              identifier: item.identifier.trim(),
              observations: item.observations?.trim() || null,
              photoUrl: item.photoUrl?.trim() || null,
            })) || [],
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 409) {
            onError("Este vehículo ya tiene una entrada activa.");
            return;
          }
          const fakeRes = new Response(JSON.stringify(payload), {
            status: response.status,
            statusText: response.statusText,
          });
          const apiError = await normalizeApiError(fakeRes);
          const userError = getUserErrorMessage(apiError, "tickets.create");
          onError(extractValidationError(apiError, userError.description));
          return;
        }

        clearIdempotencyKey("entry", idempotencyFingerprint);

        const printPayload = {
          sessionId: payload.sessionId,
          receipt: {
            ticketNumber: payload.receipt.ticketNumber,
            plate: payload.receipt.plate,
            vehicleType: payload.receipt.vehicleType as VehicleType,
            site: payload.receipt.site ?? values.site?.trim() ?? null,
            lane: payload.receipt.lane ?? values.lane?.trim() ?? null,
            booth: payload.receipt.booth ?? values.booth?.trim() ?? null,
            terminal: payload.receipt.terminal ?? values.terminal?.trim() ?? null,
            parkingSpaceCode: payload.receipt.parkingSpaceCode ?? null,
            entryAt: payload.receipt.entryAt ?? null,
          },
        };

        const previewLines = buildTicketPreviewForOperation(printPayload, "ENTRY");
        let printWarning: string | null = null;
        try {
          printWarning = await printReceiptIfTauri(printPayload, "ENTRY");
        } catch (printError) {
          printWarning =
            printError instanceof Error
              ? `No se pudo imprimir: ${printError.message}`
              : "No se pudo imprimir";
        }

        const plateLabel = payload?.receipt?.plate?.startsWith("NP-")
          ? "SIN PLACA"
          : payload?.receipt?.plate;

        const successPayload = {
          ticketNumber: payload.receipt.ticketNumber,
          plate: plateLabel,
          previewLines,
          printWarning,
          spaceCode: payload?.receipt?.parkingSpaceCode,
        };
        console.log("CALLING_ON_SUCCESS", successPayload);
        onSuccess(successPayload);

        onIncrementStats();
        onReloadOccupancy();
        idempotencyKeyRef.current = newIdempotencyKey();
        form.reset(buildFormResetValues(values, settings, isMotorcycleOnly));
      } catch (err) {
        console.error("USE_VEHICLE_ENTRY_ERROR", err);
        const validationMessage = toUserMessageFromClientValidation(err);
        if (validationMessage) {
          onError(validationMessage);
          return;
        }

        if (isNetworkError(err)) {
          const queued = await queueOfflineOperation("ENTRY_RECORDED", {
            plate: form.getValues("plate"),
            type: form.getValues("type"),
            occurredAtIso: new Date().toISOString(),
            origin: "OFFLINE_PENDING_SYNC",
          });
          if (queued) {
            clearIdempotencyKey("entry", idempotencyFingerprint);
            onOfflineQueued();
            onIncrementStats();
            form.reset(buildFormResetValues(values, settings, isMotorcycleOnly));
          } else {
            onError(
              "Sin conexión: no se pudo guardar localmente. Verifique la configuración offline.",
            );
          }
        } else {
          onError(err instanceof Error ? err.message : "Error inesperado");
        }
      } finally {
        submitLock.current = false;
      }
    },
    [
      form,
      settings,
      occupancy,
      isMotorcycleOnly,
      onSuccess,
      onError,
      onOfflineQueued,
      onIncrementStats,
      onReloadOccupancy,
      clearAutoSave,
    ],
  );

  return { submit, idempotencyKeyRef };
}
