"use client";

import { useState } from "react";

export type ColumnDef<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-2">
          {onSearch && (
            <input
              type="text"
              placeholder="Buscar..."
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearch(e.target.value); }}
            />
          )}
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              {createLabel}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          Cargando...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {columns.map((c) => (
                  <th key={String(c.key)} className={`px-4 py-3 text-left font-semibold ${c.className ?? ""}`}>
                    {c.label}
                  </th>
                ))}
                {actions && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {columns.map((c) => (
                    <td key={String(c.key)} className={`px-4 py-3 text-slate-700 ${c.className ?? ""}`}>
                      {c.render ? c.render(row) : String((row as any)[c.key] ?? "")}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3">{actions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
