"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationCashRegisters,
  createConfigurationCashRegister,
  updateConfigurationCashRegister,
  patchConfigurationCashRegisterStatus,
  type SettingsPage,
} from "@/lib/settings-api";
import { cashRegisterSchema, type CashRegisterSchema } from "@/modules/settings/schemas";
import type { CashRegisterRow } from "@/modules/settings/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/settings/FormDrawer";

const COLS: ColumnDef<CashRegisterRow>[] = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
  { key: "site", label: "Sede" },
  { key: "terminal", label: "Terminal" },
  { key: "printerName", label: "Impresora" },
  {
    key: "active",
    label: "Activo",
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {r.active ? "Sí" : "No"}
      </span>
    ),
  },
];

export default function CajasPage() {
  const [data, setData] = useState<SettingsPage<CashRegisterRow>>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CashRegisterRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CashRegisterSchema>({ resolver: zodResolver(cashRegisterSchema), defaultValues: { site: "DEFAULT", terminal: "", active: true } });

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const page = await fetchConfigurationCashRegisters({ q, page: 0, size: 50 });
      setData(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando cajas");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ site: "DEFAULT", siteId: "", code: "", name: "", terminal: "", label: "", printerId: "", responsibleUserId: "", active: true });
    setDrawerOpen(true);
  };

  const openEdit = (row: CashRegisterRow) => {
    setEditing(row);
    reset({
      site: row.site,
      siteId: row.siteId ?? "",
      code: row.code,
      name: row.name ?? "",
      terminal: row.terminal,
      label: row.label ?? "",
      printerId: row.printerId ?? "",
      responsibleUserId: row.responsibleUserId ?? "",
      active: row.active,
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: CashRegisterSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationCashRegister(editing.id, payload);
      } else {
        await createConfigurationCashRegister(payload);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const toggleStatus = async (row: CashRegisterRow) => {
    try {
      await patchConfigurationCashRegisterStatus(row.id, !row.active);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Cajas / Terminales</h1>
      <DataTableSection
        title=""
        columns={COLS}
        rows={data.content}
        loading={loading}
        onSearch={(q) => { void load(q); }}
        onCreate={openCreate}
        emptyMessage="No hay cajas registradas"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(row)} className="text-xs text-amber-600 hover:underline">Editar</button>
            <StatusToggle active={row.active} onChange={() => toggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />
      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Caja" : "Nueva Caja"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={error}
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Código</label>
          <input {...register("code")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Nombre</label>
          <input {...register("name")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Terminal</label>
          <input {...register("terminal")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {errors.terminal && <p className="mt-1 text-xs text-red-600">{errors.terminal.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Etiqueta</label>
          <input {...register("label")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Sede (ID)</label>
          <input {...register("siteId")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Impresora (ID)</label>
          <input {...register("printerId")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Responsable (ID)</label>
          <input {...register("responsibleUserId")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register("active")} className="h-4 w-4 rounded border-slate-300" />
          <label className="text-sm text-slate-700">Activa</label>
        </div>
      </FormDrawer>
    </div>
  );
}
