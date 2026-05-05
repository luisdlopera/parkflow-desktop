"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationOperationalParameters,
  putConfigurationOperationalParameters,
} from "@/lib/settings-api";
import { operationalParameterSchema, type OperationalParameterSchema } from "@/modules/settings/schemas";
import type { OperationalParameterRow } from "@/modules/settings/types";

const DEFAULT_SITE = "00000000-0000-0000-0000-000000000002";

export default function OperacionPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OperationalParameterSchema>({ resolver: zodResolver(operationalParameterSchema) });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const row = await fetchConfigurationOperationalParameters(DEFAULT_SITE);
        reset({
          allowEntryWithoutPrinter: row.allowEntryWithoutPrinter,
          allowExitWithoutPayment: row.allowExitWithoutPayment,
          allowReprint: row.allowReprint,
          allowVoid: row.allowVoid,
          requirePhotoEntry: row.requirePhotoEntry,
          requirePhotoExit: row.requirePhotoExit,
          toleranceMinutes: row.toleranceMinutes,
          maxTimeNoCharge: row.maxTimeNoCharge,
          legalMessage: row.legalMessage ?? "",
          offlineModeEnabled: row.offlineModeEnabled,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando parámetros");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reset]);

  const onSubmit = async (values: OperationalParameterSchema) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await putConfigurationOperationalParameters(DEFAULT_SITE, { ...values } as Record<string, unknown>);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Parámetros Operativos</h1>
        <p className="mt-4 text-sm text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Parámetros Operativos</h1>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Parámetros guardados correctamente.</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Permitir entrada sin impresora</p>
              <p className="text-xs text-slate-500">Si no hay impresora disponible</p>
            </div>
            <input type="checkbox" {...register("allowEntryWithoutPrinter")} className="h-5 w-5 rounded border-slate-300" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Permitir salida sin pago</p>
              <p className="text-xs text-slate-500">Para casos de cortesía o convenio</p>
            </div>
            <input type="checkbox" {...register("allowExitWithoutPayment")} className="h-5 w-5 rounded border-slate-300" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Permitir reimpresión</p>
              <p className="text-xs text-slate-500">Reimprimir tickets ya emitidos</p>
            </div>
            <input type="checkbox" {...register("allowReprint")} className="h-5 w-5 rounded border-slate-300" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Permitir anulación</p>
              <p className="text-xs text-slate-500">Anular tickets con permisos</p>
            </div>
            <input type="checkbox" {...register("allowVoid")} className="h-5 w-5 rounded border-slate-300" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Requerir foto en entrada</p>
              <p className="text-xs text-slate-500">Capturar imagen del vehículo</p>
            </div>
            <input type="checkbox" {...register("requirePhotoEntry")} className="h-5 w-5 rounded border-slate-300" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Requerir foto en salida</p>
              <p className="text-xs text-slate-500">Capturar imagen del vehículo</p>
            </div>
            <input type="checkbox" {...register("requirePhotoExit")} className="h-5 w-5 rounded border-slate-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Minutos de tolerancia</label>
            <input type="number" {...register("toleranceMinutes", { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            {errors.toleranceMinutes && <p className="mt-1 text-xs text-red-600">{errors.toleranceMinutes.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tiempo máximo sin cobro (min)</label>
            <input type="number" {...register("maxTimeNoCharge", { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Mensaje legal en ticket</label>
          <textarea {...register("legalMessage")} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Modo offline habilitado</p>
            <p className="text-xs text-slate-500">Permitir operación sin conexión</p>
          </div>
          <input type="checkbox" {...register("offlineModeEnabled")} className="h-5 w-5 rounded border-slate-300" />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar parámetros"}
          </button>
        </div>
      </form>
    </div>
  );
}
