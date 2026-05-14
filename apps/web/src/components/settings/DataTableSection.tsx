"use client";

import { useState } from "react";
import { Input, Button } from "@heroui/react";
import DataTable from "@/components/ui/DataTable";

export type ColumnDef<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
};

type DataTableSectionProps<T> = {
  title: string;
  columns: ColumnDef<T>[];
  rows: T[];
  loading?: boolean;
  onSearch?: (q: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
};

export function DataTableSection<T extends { id: string }>({
  title,
  columns,
  rows,
  loading,
  onSearch,
  onCreate,
  createLabel = "Nuevo",
  emptyMessage = "No hay registros",
  actions
}: DataTableSectionProps<T>) {
  const [q, setQ] = useState("");

  const finalColumns = [
    ...columns.map(c => ({
      key: String(c.key),
      label: c.label,
      render: c.render,
      align: c.align
    })),
    ...(actions ? [{
      key: "actions",
      label: "Acciones",
      render: (row: T) => actions(row),
      align: "right" as const
    }] : [])
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-3">
          {onSearch && (
            <Input
              type="text"
              placeholder="Buscar..."
              variant="flat"
              size="sm"
              className="max-w-xs"
              value={q}
              onValueChange={(val) => { setQ(val); onSearch(val); }}
            />
          )}
          {onCreate && (
            <Button
              color="primary"
              size="md"
              className="bg-brand-500 hover:bg-brand-600 font-semibold"
              onPress={onCreate}
            >
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      <DataTable<T>
        columns={finalColumns}
        rows={rows}
        isLoading={loading}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
