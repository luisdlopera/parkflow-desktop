"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
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
import { useDialog } from "@/components/ui/DialogProvider";
import { useConfigCrud } from "@/hooks/useConfigCrud";

const COLS: ColumnDef<RateFractionRow>[] = [
  { key: "fromMinute", label: "Desde (min)" },
  { key: "toMinute", label: "Hasta (min)" },
  { key: "value", label: "Valor" },
  { key: "roundUp", label: "Redondeo", render: (r) => (r.roundUp ? "Arriba" : "Abajo") },
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

const DEFAULTS: RateFractionSchema = { fromMinute: 0, toMinute: 0, value: 0, roundUp: true, isActive: true };

export default function FraccionesPage() {
  const [rateId, setRateId] = useState("");
  const { confirm } = useDialog();

  const crud = useConfigCrud<RateFractionRow>({
    loadFn: (id) => fetchConfigurationRateFractions(id as string),
    createFn: (data) => createConfigurationRateFraction(rateId, data),
    updateFn: (id, data) => updateConfigurationRateFraction(id, data),
    deleteFn: (id) => deleteConfigurationRateFraction(id),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RateFractionSchema>({
    resolver: zodResolver(rateFractionSchema),
    defaultValues: DEFAULTS,
  });

  const handleOpenCreate = () => {
    reset(DEFAULTS);
    crud.openCreate();
  };

  const handleOpenEdit = (row: RateFractionRow) => {
    reset({ fromMinute: row.fromMinute, toMinute: row.toMinute, value: row.value, roundUp: row.roundUp, isActive: row.isActive });
    crud.openEdit(row);
  };

  const onSubmit = async (values: RateFractionSchema) => {
    const ok = await crud.save(values as Record<string, unknown>);
    if (ok) void crud.load(rateId);
  };

  const handleDelete = async (id: string) => {
    await crud.handleDelete(id, () => confirm("¿Eliminar esta fracción?"));
    void crud.load(rateId);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Fracciones de Tarifa</h1>
      <div className="flex items-center gap-3">
        <Input
          type="text"
          placeholder="ID de tarifa"
          size="sm"
          className="max-w-xs"
          value={rateId}
          onChange={(e) => setRateId(e.target.value)}
        />
        <Button
          size="sm"
          color="primary"
          className="font-bold"
          onPress={() => { void crud.load(rateId); }}
          isLoading={crud.loading}
        >
          Cargar
        </Button>
      </div>
      <DataTableSection
        title=""
        columns={COLS}
        rows={crud.rows}
        loading={crud.loading}
        onCreate={handleOpenCreate}
        emptyMessage="No hay fracciones para esta tarifa"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="tertiary" color="primary" className="font-semibold" onPress={() => handleOpenEdit(row)}>
              Editar
            </Button>
            <Button size="sm" variant="tertiary" color="danger" className="font-semibold" onPress={() => handleDelete(row.id)}>
              Eliminar
            </Button>
          </div>
        )}
      />
      <FormDrawer
        open={crud.drawerOpen}
        title={crud.editing ? "Editar Fracción" : "Nueva Fracción"}
        onClose={crud.closeDrawer}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={crud.error}
      >
        <div className="space-y-4">
          <Input {...register("fromMinute", { valueAsNumber: true })} label="Desde (minutos)" type="number" errorMessage={errors.fromMinute?.message} isInvalid={!!errors.fromMinute} />
          <Input {...register("toMinute", { valueAsNumber: true })} label="Hasta (minutos)" type="number" errorMessage={errors.toMinute?.message} isInvalid={!!errors.toMinute} />
          <Input {...register("value", { valueAsNumber: true })} label="Valor" type="number" step="0.01" errorMessage={errors.value?.message} isInvalid={!!errors.value} />
          <Checkbox {...register("roundUp")}>Redondear hacia arriba</Checkbox>
          <Checkbox {...register("isActive")}>Activa</Checkbox>
        </div>
      </FormDrawer>
    </div>
  );
}
