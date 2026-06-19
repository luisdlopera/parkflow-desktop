"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/bridge/Button";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { useConfigCrud } from "@/hooks/core/useConfigCrud";
import type { SettingsPage } from "@/lib/settings-api";

interface ConfigSectionProps<T extends { id: string }> {
  title: string;
  columns: ColumnDef<T>[];
  schema: z.ZodObject<z.ZodRawShape>;
  defaultValues: Record<string, unknown>;
  loadFn: (...args: unknown[]) => Promise<SettingsPage<T> | T[]>;
  createFn?: (data: Record<string, unknown>) => Promise<unknown>;
  updateFn?: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  deleteFn?: (id: string) => Promise<unknown>;
  toggleStatusFn?: (id: string, active: boolean) => Promise<unknown>;
  formFields: (form: ReturnType<typeof useForm>) => React.ReactNode;
  emptyMessage?: string;
  createLabel?: string;
  drawerTitle?: string;
  showSearch?: boolean;
}

export function ConfigSection<T extends { id: string }>({
  title,
  columns,
  schema: schemaProp,
  defaultValues,
  loadFn,
  createFn,
  updateFn,
  deleteFn,
  toggleStatusFn,
  formFields,
  emptyMessage = "No hay registros",
  createLabel = "Nuevo",
  drawerTitle,
  showSearch = true,
}: ConfigSectionProps<T>) {
  const crud = useConfigCrud<T>({ loadFn, createFn, updateFn, deleteFn, toggleStatusFn });

  const form = useForm({ resolver: zodResolver(schemaProp), defaultValues });
  const { handleSubmit, reset, formState: { isSubmitting } } = form;

  useEffect(() => { void crud.load(); }, []);

  const handleOpenCreate = () => {
    reset(defaultValues);
    crud.openCreate();
  };

  const handleOpenEdit = (row: T) => {
    reset(row as Record<string, unknown>);
    crud.openEdit(row);
  };

  const onSubmit = async (values: Record<string, unknown>) => {
    const ok = await crud.save(values);
    if (ok) void crud.load();
  };

  const resolvedDrawerTitle = drawerTitle ?? title;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <DataTableSection
        title=""
        columns={columns}
        rows={crud.rows}
        loading={crud.loading}
        onSearch={showSearch ? (q) => { void crud.load(q); } : undefined}
        onCreate={handleOpenCreate}
        createLabel={createLabel}
        emptyMessage={emptyMessage}
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="tertiary" color="primary" className="font-semibold" onPress={() => handleOpenEdit(row)}>
              Editar
            </Button>
            {toggleStatusFn && (
              <StatusToggle
                active={(row as unknown as Record<string, boolean>).isActive}
                onChange={() => crud.handleToggleStatus(row)}
                confirmMessage="¿Cambiar estado?"
              />
            )}
            {deleteFn && (
              <Button size="sm" variant="tertiary" color="danger" className="font-semibold" onPress={() => crud.handleDelete(row.id)}>
                Eliminar
              </Button>
            )}
          </div>
        )}
      />
      <FormDrawer
        open={crud.drawerOpen}
        title={crud.editing ? `Editar ${resolvedDrawerTitle}` : `Nuevo ${resolvedDrawerTitle}`}
        onClose={crud.closeDrawer}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={crud.error}
      >
        <div className="space-y-4">
          {formFields(form)}
        </div>
      </FormDrawer>
    </div>
  );
}
