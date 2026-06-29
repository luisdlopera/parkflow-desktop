"use client";

import { ConfigPageHeader } from "@/features/configuration/components/ui/ConfigPageHeader";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchConfigurationPaymentMethods,
  createConfigurationPaymentMethod,
  updateConfigurationPaymentMethod,
  patchConfigurationPaymentMethodStatus,
} from "@/lib/api/payment-methods-api";
import { paymentMethodSchema, type PaymentMethodSchema } from "@/lib/schemas/config.schemas";
import type { PaymentMethodRow } from "@/lib/types/settings.types";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { useConfigCrud } from "@/hooks/core/useConfigCrud";
import { PAYMENT_METHOD_CATALOG } from "@/lib/payment-method-catalog";
import { toast } from "@heroui/react";

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
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-default-100 text-default-500"}`}>
        {r.isActive ? "Sí" : "No"}
      </span>
    ),
  },
];

const DEFAULTS: PaymentMethodSchema = { code: "", name: "", requiresReference: false, isActive: true, displayOrder: 0 };

export default function MetodosPagoPage() {
  const [activating, setActivating] = useState<string | null>(null);

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

  const enabledCodes = new Set(crud.rows.map((r) => r.code));
  const catalogueToAdd = PAYMENT_METHOD_CATALOG.filter(
    (m) => m.availableInOnboarding && !enabledCodes.has(m.code)
  );

  const handleActivateFromCatalogue = async (code: string) => {
    const entry = PAYMENT_METHOD_CATALOG.find((m) => m.code === code);
    if (!entry) return;
    setActivating(code);
    try {
      await createConfigurationPaymentMethod({
        code: entry.code,
        name: entry.label,
        requiresReference: entry.requiresReference,
        isActive: true,
        displayOrder: PAYMENT_METHOD_CATALOG.indexOf(entry) + 1,
      });
      toast.success(`${entry.label} activado`);
      void crud.load();
    } catch {
      toast.danger(`No se pudo activar ${entry.label}`);
    } finally {
      setActivating(null);
    }
  };

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
      <ConfigPageHeader title="Métodos de Pago" groupLabel="Cobro" groupId="cobro" sectionLabel="Métodos de pago" />
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
      {catalogueToAdd.length > 0 && (
        <div className="rounded-xl border border-default-200 bg-default-50 dark:bg-default-100 p-5">
          <p className="mb-3 text-sm font-semibold text-default-700">Agregar desde catálogo estándar</p>
          <div className="flex flex-wrap gap-2">
            {catalogueToAdd.map((m) => (
              <button
                key={m.code}
                onClick={() => handleActivateFromCatalogue(m.code)}
                disabled={activating === m.code}
                className="flex items-center gap-1.5 rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-sm font-medium text-default-700 hover:bg-default-100 disabled:opacity-50"
              >
                <span className="text-xs text-default-400">+</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
