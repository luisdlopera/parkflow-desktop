"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationRateFractions,
  createConfigurationRateFraction,
  updateConfigurationRateFraction,
  deleteConfigurationRateFraction,
} from "@/lib/settings-api";
import { rateFractionSchema, type RateFractionSchema } from "@/modules/settings/schemas";
import type { RateFractionRow } from "@/modules/settings/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { FormDrawer } from "@/components/settings/FormDrawer";

const COLS: ColumnDef<RateFractionRow>[] = [
  { key: "fromMinute", label: "Desde (min)" },
  { key: "toMinute", label: "Hasta (min)" },
  { key: "value", label: "Valor" },
  {
    key: "roundUp",
    label: "Redondeo",
    render: (r) => (r.roundUp ? "Arriba" : "Abajo"),
  },
  {
    key: "isActive",
    label: "Activo",
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {r.isActive ? "Sí" : "No"}
      </span>
    ),
  },
];

export default function FraccionesPage() {
  const [rateId, setRateId] = useState("");
  const [rows, setRows] = useState<RateFractionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RateFractionRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RateFractionSchema>({ resolver: zodResolver(rateFractionSchema), defaultValues: { roundUp: true, isActive: true } });

  const load = async () => {
    if (!rateId.trim()) return;
    setLoading(true);
    try {
      const list = await fetchConfigurationRateFractions(rateId);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando fracciones");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ fromMinute: 0, toMinute: 0, value: 0, roundUp: true, isActive: true });
    setDrawerOpen(true);
  };

  const openEdit = (row: RateFractionRow) => {
    setEditing(row);
    reset({ fromMinute: row.fromMinute, toMinute: row.toMinute, value: row.value, roundUp: row.roundUp, isActive: row.isActive });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: RateFractionSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationRateFraction(editing.id, payload);
      } else {
        await createConfigurationRateFraction(rateId, payload);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar esta fracción?")) return;
    try {
      await deleteConfigurationRateFraction(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error eliminando");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Fracciones de Tarifa</h1>
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="ID de tarifa"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={rateId}
          onChange={(e) => setRateId(e.target.value)}
        />
        <button onClick={() => { void load(); }} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">
          Cargar
        </button>
      </div>
      <DataTableSection
        title=""
        columns={COLS}
        rows={rows}
        loading={loading}
        onCreate={openCreate}
        emptyMessage="No hay fracciones para esta tarifa"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(row)} className="text-xs text-amber-600 hover:underline">Editar</button>
            <button onClick={() => handleDelete(row.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
          </div>
        )}
      />
      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Fracción" : "Nueva Fracción"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={error}
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Desde (minutos)</label>
          <input type="number" {...register("fromMinute", { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {errors.fromMinute && <p className="mt-1 text-xs text-red-600">{errors.fromMinute.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Hasta (minutos)</label>
          <input type="number" {...register("toMinute", { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {errors.toMinute && <p className="mt-1 text-xs text-red-600">{errors.toMinute.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Valor</label>
          <input type="number" step="0.01" {...register("value", { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {errors.value && <p className="mt-1 text-xs text-red-600">{errors.value.message}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register("roundUp")} className="h-4 w-4 rounded border-slate-300" />
          <label className="text-sm text-slate-700">Redondear hacia arriba</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-slate-300" />
          <label className="text-sm text-slate-700">Activa</label>
        </div>
      </FormDrawer>
    </div>
  );
}
