"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationPrinters,
  createConfigurationPrinter,
  updateConfigurationPrinter,
  patchConfigurationPrinterStatus,
  type SettingsPage,
} from "@/lib/settings-api";
import { printerSchema, type PrinterSchema } from "@/modules/settings/schemas";
import type { PrinterRow } from "@/modules/settings/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/settings/FormDrawer";

const COLS: ColumnDef<PrinterRow>[] = [
  { key: "name", label: "Nombre" },
  { key: "type", label: "Tipo" },
  { key: "connection", label: "Conexión" },
  { key: "paperWidthMm", label: "Ancho (mm)" },
  {
    key: "isDefault",
    label: "Predet.",
    render: (r) => (r.isDefault ? "Sí" : "No"),
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

export default function ImpresorasPage() {
  const [data, setData] = useState<SettingsPage<PrinterRow>>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PrinterRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrinterSchema>({ resolver: zodResolver(printerSchema), defaultValues: { type: "THERMAL", connection: "USB", paperWidthMm: 80, isActive: true, isDefault: false } });

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const page = await fetchConfigurationPrinters({ q, page: 0, size: 50 });
      setData(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando impresoras");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", type: "THERMAL", connection: "USB", paperWidthMm: 80, endpointOrDevice: "", isActive: true, isDefault: false });
    setDrawerOpen(true);
  };

  const openEdit = (row: PrinterRow) => {
    setEditing(row);
    reset({ name: row.name, type: row.type, connection: row.connection, paperWidthMm: row.paperWidthMm as 58 | 80, endpointOrDevice: row.endpointOrDevice ?? "", isActive: row.isActive, isDefault: row.isDefault });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: PrinterSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationPrinter(editing.id, payload);
      } else {
        await createConfigurationPrinter(payload, "00000000-0000-0000-0000-000000000002");
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const toggleStatus = async (row: PrinterRow) => {
    try {
      await patchConfigurationPrinterStatus(row.id, !row.isActive);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Impresoras</h1>
      <DataTableSection
        title=""
        columns={COLS}
        rows={data.content}
        loading={loading}
        onSearch={(q) => { void load(q); }}
        onCreate={openCreate}
        emptyMessage="No hay impresoras registradas"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(row)} className="text-xs text-amber-600 hover:underline">Editar</button>
            <StatusToggle active={row.isActive} onChange={() => toggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />
      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Impresora" : "Nueva Impresora"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={error}
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Nombre</label>
          <input {...register("name")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Tipo</label>
          <select {...register("type")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="THERMAL">Térmica</option>
            <option value="PDF">PDF</option>
            <option value="OS">Sistema</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Conexión</label>
          <select {...register("connection")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="USB">USB</option>
            <option value="NET">Red</option>
            <option value="BLUETOOTH">Bluetooth</option>
            <option value="LOCAL_AGENT">Agente local</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Ancho papel (mm)</label>
          <select {...register("paperWidthMm", { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value={58}>58</option>
            <option value={80}>80</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Endpoint / Dispositivo</label>
          <input {...register("endpointOrDevice")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register("isDefault")} className="h-4 w-4 rounded border-slate-300" />
          <label className="text-sm text-slate-700">Predeterminada</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-slate-300" />
          <label className="text-sm text-slate-700">Activa</label>
        </div>
      </FormDrawer>
    </div>
  );
}
