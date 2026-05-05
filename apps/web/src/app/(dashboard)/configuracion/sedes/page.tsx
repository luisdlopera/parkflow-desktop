"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationSites,
  createConfigurationSite,
  updateConfigurationSite,
  patchConfigurationSiteStatus,
  type SettingsPage,
} from "@/lib/settings-api";
import { parkingSiteSchema, type ParkingSiteSchema } from "@/modules/settings/schemas";
import type { ParkingSiteRow } from "@/modules/settings/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/settings/FormDrawer";

const SITE_COLUMNS: ColumnDef<ParkingSiteRow>[] = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
  { key: "city", label: "Ciudad" },
  { key: "currency", label: "Moneda" },
  {
    key: "isActive",
    label: "Activo",
    render: (row) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {row.isActive ? "Sí" : "No"}
      </span>
    ),
  },
];

export default function SedesPage() {
  const [data, setData] = useState<SettingsPage<ParkingSiteRow>>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ParkingSiteRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ParkingSiteSchema>({ resolver: zodResolver(parkingSiteSchema), defaultValues: { timezone: "America/Bogota", currency: "COP", isActive: true } });

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const page = await fetchConfigurationSites({ q, page: 0, size: 50 });
      setData(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando sedes");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ code: "", name: "", address: "", city: "", phone: "", managerName: "", timezone: "America/Bogota", currency: "COP", isActive: true });
    setDrawerOpen(true);
  };

  const openEdit = (row: ParkingSiteRow) => {
    setEditing(row);
    reset({
      code: row.code,
      name: row.name,
      address: row.address ?? "",
      city: row.city ?? "",
      phone: row.phone ?? "",
      managerName: row.managerName ?? "",
      timezone: row.timezone,
      currency: row.currency,
      isActive: row.isActive,
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: ParkingSiteSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationSite(editing.id, payload);
      } else {
        await createConfigurationSite(payload, "00000000-0000-0000-0000-000000000001");
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const toggleStatus = async (row: ParkingSiteRow) => {
    try {
      await patchConfigurationSiteStatus(row.id, !row.isActive);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Sedes / Parqueaderos</h1>
      <DataTableSection
        title=""
        columns={SITE_COLUMNS}
        rows={data.content}
        loading={loading}
        onSearch={(q) => { void load(q); }}
        onCreate={openCreate}
        emptyMessage="No hay sedes registradas"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(row)} className="text-xs text-amber-600 hover:underline">Editar</button>
            <StatusToggle active={row.isActive} onChange={() => toggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />
      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Sede" : "Nueva Sede"}
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
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Ciudad</label>
          <input {...register("city")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Dirección</label>
          <input {...register("address")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Teléfono</label>
          <input {...register("phone")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Responsable</label>
          <input {...register("managerName")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Zona horaria</label>
          <input {...register("timezone")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Moneda</label>
          <input {...register("currency")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-slate-300" />
          <label className="text-sm text-slate-700">Activo</label>
        </div>
      </FormDrawer>
    </div>
  );
}
