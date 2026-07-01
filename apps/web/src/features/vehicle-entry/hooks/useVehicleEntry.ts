"use client";
import { useRef, useCallback } from "react";
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
import { errorService } from "@/lib/errors/error-service";
import { normalizePlate } from "@/lib/validation/plate-validator";
import { toUserMessageFromClientValidation } from "@/lib/validation/request-guard";
import { currentUser } from "@/lib/services/auth-domain.service";
import type { VehicleType } from "@parkflow/types";
import { createParkingEntry } from "@/features/vehicle-entry/services/vehicle-entry.service";
import { buildFormResetValues, isNetworkError, resolveVehicleType } from "../lib/vehicle-entry-utils";
import type { VehicleEntryFormValues } from "@/lib/schemas/vehicle.schema";
import type { UseVehicleEntryOptions } from "../types";

function extractValidationError(pfError: any, defaultMsg: string): string {
  if (pfError.code === "VALIDATION_ERROR") {
    if (pfError.fieldErrors && Object.keys(pfError.fieldErrors).length > 0) {
      const firstKey = Object.keys(pfError.fieldErrors)[0];
      return `${firstKey}: ${pfError.fieldErrors[firstKey]}`;
    }
  }
  return defaultMsg;
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
          const pfError = errorService.normalize({ ...payload, status: response.status });
          onError(extractValidationError(pfError, pfError.message));
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

        const isNoPlate = payload?.receipt?.plate?.startsWith("NP-") || payload?.receipt?.plate?.startsWith("SIN-");
        const plateLabel = isNoPlate
          ? "SIN PLACA"
          : payload?.receipt?.plate;

        const successPayload = {
          ticketNumber: payload.receipt.ticketNumber,
          plate: plateLabel,
          previewLines,
          printWarning,
          spaceCode: payload?.receipt?.parkingSpaceCode,
        };
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
            rateId: form.getValues("rateId") || null,
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
