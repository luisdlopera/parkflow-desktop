"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { vehicleEntrySchema, VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import { buildApiHeaders } from "@/lib/api";
import { printReceiptIfTauri } from "@/lib/tauri-print";

export default function VehicleEntryForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const defaultOperatorUserId =
    process.env.NEXT_PUBLIC_DEFAULT_OPERATOR_USER_ID ?? "00000000-0000-0000-0000-000000000002";

  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: {
      plate: "",
      type: "CAR",
      rateId: "",
      operatorUserId: defaultOperatorUserId,
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
    setMessage("");
    setError("");

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1/operations";

      const response = await fetch(`${apiBase}/entries`, {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
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

      let printWarning: string | null = null;
      try {
        printWarning = await printReceiptIfTauri(payload, "ENTRY");
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
        operatorUserId: values.operatorUserId,
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
      setError("Error de red registrando ingreso");
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

      <div>
        <label className="text-sm font-medium text-slate-700">Operador (UUID)</label>
        <input
          {...form.register("operatorUserId")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="00000000-0000-0000-0000-000000000002"
        />
        {form.formState.errors.operatorUserId && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.operatorUserId.message}</p>
        )}
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
    </form>
  );
}
