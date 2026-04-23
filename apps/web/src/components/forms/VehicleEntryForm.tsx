"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import TicketReceiptPreview from "@/components/tickets/TicketReceiptPreview";
import { vehicleEntrySchema, VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import { buildApiHeaders } from "@/lib/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import {
  buildTicketPreviewForOperation,
  printReceiptIfTauri,
  resolvePaperWidthMm
} from "@/lib/tauri-print";
import type { VehicleType } from "@parkflow/types";

export default function VehicleEntryForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);
  const submitLock = useRef(false);

  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: {
      plate: "",
      type: "CAR",
      rateId: "",
      site: "Principal",
      lane: "",
      booth: "",
      terminal: "",
      observations: "",
      vehicleCondition: "Sin novedades al ingreso",
      conditionChecklist: "",
      conditionPhotoUrls: ""
    }
  });

  const onSubmit = async (values: VehicleEntryFormValues) => {
    if (submitLock.current) {
      return;
    }
    submitLock.current = true;
    setMessage("");
    setError("");
    setPreviewLines(null);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1/operations";

      const response = await fetch(`${apiBase}/entries`, {
        method: "POST",
        headers: await buildApiHeaders(),
        body: JSON.stringify({
          idempotencyKey: newIdempotencyKey(),
          ...values,
          rateId: values.rateId?.trim() ? values.rateId.trim() : null,
          site: values.site?.trim() || null,
          lane: values.lane?.trim() || null,
          booth: values.booth?.trim() || null,
          terminal: values.terminal?.trim() || null,
          observations: values.observations?.trim() || null,
          vehicleCondition: values.vehicleCondition.trim(),
          conditionChecklist: values.conditionChecklist
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          conditionPhotoUrls: values.conditionPhotoUrls
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "No se pudo registrar el ingreso");
        return;
      }

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
          entryAt: payload.receipt.entryAt ?? null
        }
      };
      setPreviewLines(buildTicketPreviewForOperation(printPayload, "ENTRY"));

      let printWarning: string | null = null;
      try {
        printWarning = await printReceiptIfTauri(printPayload, "ENTRY");
      } catch (printError) {
        printWarning =
          printError instanceof Error
            ? `No se pudo imprimir en desktop: ${printError.message}`
            : "No se pudo imprimir en desktop.";
      }
      setMessage(
        printWarning
          ? `Ingreso registrado. Ticket: ${payload.receipt.ticketNumber}. ${printWarning}`
          : `Ingreso registrado. Ticket: ${payload.receipt.ticketNumber}`
      );
      form.reset({
        plate: "",
        type: "CAR",
        rateId: "",
        site: values.site,
        lane: values.lane,
        booth: values.booth,
        terminal: values.terminal,
        observations: "",
        vehicleCondition: "Sin novedades al ingreso",
        conditionChecklist: "",
        conditionPhotoUrls: ""
      });
    } catch {
      const queued = await queueOfflineOperation("ENTRY_RECORDED", {
        plate: values.plate,
        type: values.type,
        occurredAtIso: new Date().toISOString(),
        origin: "OFFLINE_PENDING_SYNC"
      });
      if (queued) {
        setMessage("Sin internet: ingreso guardado en cola offline para sincronizacion.");
      } else {
        setError("Error de red registrando ingreso");
      }
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="surface space-y-4 rounded-2xl p-6">
      <div>
        <label className="text-sm font-medium text-slate-700">Placa</label>
        <input
          {...form.register("plate")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="ABC123"
        />
        {form.formState.errors.plate && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.plate.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Tipo</label>
        <select
          {...form.register("type")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="CAR">Carro</option>
          <option value="MOTORCYCLE">Moto</option>
          <option value="VAN">Van</option>
          <option value="TRUCK">Camion</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Tarifa</label>
        <input
          {...form.register("rateId")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="Tarifa por defecto"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Sede</label>
          <input
            {...form.register("site")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="Principal"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Carril</label>
          <input
            {...form.register("lane")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Caja</label>
          <input
            {...form.register("booth")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="Caja 1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Terminal</label>
          <input
            {...form.register("terminal")}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            placeholder="T1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Estado del vehiculo</label>
        <textarea
          {...form.register("vehicleCondition")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          rows={3}
          placeholder="Sin rayones, casco en baul"
        />
        {form.formState.errors.vehicleCondition && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.vehicleCondition.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Checklist (separado por comas)</label>
        <input
          {...form.register("conditionChecklist")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="luces ok, espejo derecho ok"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Fotos (URLs separadas por comas)</label>
        <input
          {...form.register("conditionPhotoUrls")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="https://.../foto1.jpg,https://.../foto2.jpg"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Observaciones</label>
        <textarea
          {...form.register("observations")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          rows={2}
          placeholder="Notas adicionales"
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          label={form.formState.isSubmitting ? "Registrando..." : "Registrar ingreso"}
          tone="primary"
        />
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {previewLines ? (
        <TicketReceiptPreview lines={previewLines} paperWidthMm={resolvePaperWidthMm()} />
      ) : null}
    </form>
  );
}
