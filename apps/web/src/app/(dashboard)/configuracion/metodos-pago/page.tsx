"use client";

import { ConfigPageHeader } from "@/features/configuration/components/ui/ConfigPageHeader";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationPaymentMethods,
  createConfigurationPaymentMethod,
  updateConfigurationPaymentMethod,
  patchConfigurationPaymentMethodStatus,
} from "@/lib/settings-api";
import { paymentMethodSchema, type PaymentMethodSchema } from "@/modules/settings/schemas";
import type { PaymentMethodRow } from "@/modules/settings/types";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { useConfigCrud } from "@/hooks/core/useConfigCrud";

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

const DEFAULTS: PaymentMethodSchema = { code: "", name: "", requiresReference: false, isActive: true, displayOrder: 0 };

export default function MetodosPagoPage() {
  const crud = useConfigCrud<PaymentMethodRow>({
    loadFn: (q?: unknown) => fetchConfigurationPaymentMethods({ q: q as string, page: 0, size: 50 }),
    createFn: (data) => createConfigurationPaymentMethod(data),
    updateFn: (id, data) => updateConfigurationPaymentMethod(id, data),
    toggleStatusFn: (id, active) => patchConfigurationPaymentMethodStatus(id, active),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PaymentMethodSchema>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => { void crud.load(); }, []);

  const handleOpenCreate = () => {
    reset(DEFAULTS);
    crud.openCreate();
  };

  const handleOpenEdit = (row: PaymentMethodRow) => {
    reset({ code: row.code, name: row.name, requiresReference: row.requiresReference, isActive: row.isActive, displayOrder: row.displayOrder });
    crud.openEdit(row);
  };

  const onSubmit = async (values: PaymentMethodSchema) => {
    const ok = await crud.save(values as Record<string, unknown>);
    if (ok) void crud.load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <ConfigPageHeader title="Métodos de Pago" groupLabel="Cobro" sectionLabel="Métodos de pago" />
      <DataTableSection
        title=""
        columns={COLS}
        rows={crud.rows}
        loading={crud.loading}
        onSearch={(q) => { void crud.load(q); }}
        onCreate={handleOpenCreate}
        emptyMessage="No hay métodos de pago registrados"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="tertiary" color="primary" className="font-semibold" onPress={() => handleOpenEdit(row)}>
              Editar
            </Button>
            <StatusToggle active={row.isActive} onChange={() => crud.handleToggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />
      <FormDrawer
        open={crud.drawerOpen}
        title={crud.editing ? "Editar Método" : "Nuevo Método"}
        onClose={crud.closeDrawer}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={crud.error}
      >
        <div className="space-y-4">
          <Input {...register("code")} label="Código" placeholder="CASH" errorMessage={errors.code?.message} isInvalid={!!errors.code} />
          <Input {...register("name")} label="Nombre" placeholder="Efectivo" errorMessage={errors.name?.message} isInvalid={!!errors.name} />
          <Input {...register("displayOrder", { valueAsNumber: true })} label="Orden de visualización" type="number" />
          <Checkbox {...register("requiresReference")}>Requiere referencia</Checkbox>
          <Checkbox {...register("isActive")}>Activo</Checkbox>
        </div>
      </FormDrawer>
    </div>
  );
}
