"use client";

import { useMemo, useState } from "react";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { Inbox } from "lucide-react";

export type DataTableColumn<T> = {
  key: keyof T | string;
  label?: string;
  header?: string;
  priority?: "high" | "medium" | "low";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
};

type FilterConfig = {
  key: string;
  label: string;
  type: "text" | "select" | "boolean" | "date" | "dateRange" | "numberRange";
  options?: { label: string; value: string }[];
};

export type DataTableProps<T> = {
  title?: string;
  description?: string;
  columns: DataTableColumn<T>[];
  data?: T[];
  rows?: T[];
  getRowKey?: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  filters?: FilterConfig[];
  onFilterChange?: (values: Record<string, string>) => void;
  actions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: number[];
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
};

export default function DataTable<T extends object>({
  columns,
  data,
  rows,
  emptyMessage = "No hay datos disponibles",
  rowKey = (_, index) => index,
  getRowKey,
  isLoading = false,
  error,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  const source = data ?? rows ?? [];

  const getAlignmentClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  const getDisplayLabel = (column: DataTableColumn<T>) =>
    column.label ?? column.header ?? String(column.key);

  const renderCell = (column: DataTableColumn<T>, row: T) => {
    if (column.render) return column.render(row);
    return String(row[column.key as keyof T] ?? "");
  };

  // Mobile view - card-based layout
  if (isMobile) {
    return (
      <div className="space-y-4 md:hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4 rounded-3xl border border-slate-200/60 bg-white/50 dark:bg-gray-800/60 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500 dark:text-gray-300">Cargando datos...</p>
          </div>
        ) : source.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 dark:bg-gray-800/50 dark:border-gray-700 backdrop-blur-sm">
            <Inbox className="w-10 h-10 text-slate-300 dark:text-gray-400" />
            <p className="text-sm font-medium text-slate-500 dark:text-gray-300">{emptyMessage}</p>
          </div>
        ) : (
          source.map((row, rowIndex) => {
            const displayKey = getRowKey ? getRowKey(row) : String(rowKey(row, rowIndex));
            const highPriorityColumns = columns.filter((c) => c.priority === "high" || !c.priority);
            const mediumPriorityColumns = columns.filter((c) => c.priority === "medium");

            return (
              <div
                key={displayKey}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-gray-800 shadow-sm dark:border-gray-700 transition-all hover:shadow-md active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/0 to-amber-50/50 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative p-5 space-y-4">
                  {/* Primary field - header style */}
                  {highPriorityColumns[0] && (
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest">
                          {getDisplayLabel(highPriorityColumns[0])}
                        </span>
                        <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                          {renderCell(highPriorityColumns[0], row)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other high priority fields in a grid */}
                  {highPriorityColumns.length > 1 && (
                    <div className="grid grid-cols-2 gap-4">
                      {highPriorityColumns.slice(1).map((column) => (
                        <div key={String(column.key)} className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-widest">
                            {getDisplayLabel(column)}
                          </span>
                          <div className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                            {renderCell(column, row)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Medium priority fields - subtle footer */}
                  {mediumPriorityColumns.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-2">
                      {mediumPriorityColumns.map((column) => (
                        <div key={String(column.key)} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-tight">
                            {getDisplayLabel(column)}:
                          </span>
                          <span className="text-xs font-medium text-slate-600 dark:text-gray-300">
                            {renderCell(column, row)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Desktop view - elegant table layout
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 dark:bg-gray-800/80 dark:border-gray-700/60 backdrop-blur-md shadow-sm hidden md:block animate-in fade-in duration-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 dark:text-gray-300 min-w-[800px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-gray-800/50">
              {columns.map((column, idx) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-gray-700 ${getAlignmentClass(column.align)} ${idx === 0 ? "pl-8" : ""} ${idx === columns.length - 1 ? "pr-8" : ""}`}
                >
                  {getDisplayLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-8 h-8 border-3 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-400 dark:text-gray-300">Sincronizando datos...</p>
                  </div>
                </td>
              </tr>
            ) : source.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-24">
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-60">
                    <div className="p-4 rounded-full bg-slate-50 border border-slate-100 dark:bg-gray-800 dark:border-gray-700">
                      <Inbox className="w-8 h-8 text-slate-300 dark:text-gray-400" />
                    </div>
                    <p className="text-base font-medium text-slate-500 dark:text-gray-300">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              source.map((row, rowIndex) => {
                const displayKey = getRowKey ? getRowKey(row) : String(rowKey(row, rowIndex));
                return (
                  <tr
                    key={displayKey}
                    className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/60 transition-all duration-200 ease-out"
                  >
                    {columns.map((column, idx) => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4.5 whitespace-nowrap transition-colors group-hover:text-slate-900 dark:group-hover:text-white ${getAlignmentClass(column.align)} ${idx === 0 ? "pl-8 font-semibold" : ""} ${idx === columns.length - 1 ? "pr-8" : ""}`}
                      >
                        {renderCell(column, row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
