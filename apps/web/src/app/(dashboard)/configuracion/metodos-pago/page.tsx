"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationPaymentMethods,
  createConfigurationPaymentMethod,
  updateConfigurationPaymentMethod,
  patchConfigurationPaymentMethodStatus,
  type SettingsPage,
} from "@/lib/settings-api";
import { paymentMethodSchema, type PaymentMethodSchema } from "@/modules/settings/schemas";
import type { PaymentMethodRow } from "@/modules/settings/types";
import { Input, Button, Checkbox } from "@heroui/react";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/settings/FormDrawer";

const COLS: ColumnDef<PaymentMethodRow>[] = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
  {
    key: "requiresReference",
    label: "Ref.",
    render: (r) => (r.requiresReference ? "Sí" : "No"),
  },
  { key: "displayOrder", label: "Orden" },
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

export default function MetodosPagoPage() {
  const [data, setData] = useState<SettingsPage<PaymentMethodRow>>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodSchema>({ resolver: zodResolver(paymentMethodSchema), defaultValues: { requiresReference: false, isActive: true, displayOrder: 0 } });

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const page = await fetchConfigurationPaymentMethods({ q, page: 0, size: 50 });
      setData(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando métodos de pago");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ code: "", name: "", requiresReference: false, isActive: true, displayOrder: 0 });
    setDrawerOpen(true);
  };

  const openEdit = (row: PaymentMethodRow) => {
    setEditing(row);
    reset({ code: row.code, name: row.name, requiresReference: row.requiresReference, isActive: row.isActive, displayOrder: row.displayOrder });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: PaymentMethodSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationPaymentMethod(editing.id, payload);
      } else {
        await createConfigurationPaymentMethod(payload);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const toggleStatus = async (row: PaymentMethodRow) => {
    try {
      await patchConfigurationPaymentMethodStatus(row.id, !row.isActive);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Métodos de Pago</h1>
      <DataTableSection
        title=""
        columns={COLS}
        rows={data.content}
        loading={loading}
        onSearch={(q) => { void load(q); }}
        onCreate={openCreate}
        emptyMessage="No hay métodos de pago registrados"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              color="primary"
              className="font-semibold"
              onPress={() => openEdit(row)}
            >
              Editar
            </Button>
            <StatusToggle active={row.isActive} onChange={() => toggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />
      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Método" : "Nuevo Método"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={error}
      >
        <div className="space-y-4">
          <Input
            {...register("code")}
            label="Código"
            placeholder="CASH"
            variant="flat"
            errorMessage={errors.code?.message}
            isInvalid={!!errors.code}
          />
          <Input
            {...register("name")}
            label="Nombre"
            placeholder="Efectivo"
            variant="flat"
            errorMessage={errors.name?.message}
            isInvalid={!!errors.name}
          />
          <Input
            {...register("displayOrder", { valueAsNumber: true })}
            label="Orden de visualización"
            type="number"
            variant="flat"
          />
          <Checkbox {...register("requiresReference")}>
            Requiere referencia
          </Checkbox>
          <Checkbox {...register("isActive")}>
            Activo
          </Checkbox>
        </div>
      </FormDrawer>
    </div>
  );
}
