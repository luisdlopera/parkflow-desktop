"use client";

import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { AlertCircle, Inbox } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  Checkbox,
  Input,
  Button,
  Pagination,
  Select,
  SelectItem,
} from "@heroui/react";

// Public types expected by the user (and used across the app)
export type DataTableColumn<T> = {
  key: keyof T | string;
  header?: string; // newer name
  label?: string; // legacy
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  width?: string;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
  priority?: "high" | "medium" | "low"; // legacy used by mobile cards
};

export type DataTableFilter = {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "dateRange" | "numberRange" | "boolean";
  options?: Array<{ label: string; value: string }>;
};

export type DataTableProps<T> = {
  title?: string;
  description?: string;
  columns: DataTableColumn<T>[];
  data?: T[]; // preferred name
  rows?: T[]; // legacy name support
  getRowKey?: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
  filters?: DataTableFilter[];
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  sorting?: {
    sortKey?: string;
    direction?: "asc" | "desc";
    onSortChange?: (key: string, direction: "asc" | "desc") => void;
  };
  onSearchChange?: (value: string) => void;
  onFilterChange?: (filters: Record<string, any>) => void;
  toolbarActions?: React.ReactNode;
};

export default function DataTable<T extends Record<string, any>>(
  props: DataTableProps<T>
) {
  // Backwards-compat: accept rows or data
  const {
    columns,
    data,
    rows,
    getRowKey,
    isLoading = false,
    emptyMessage = "No hay datos disponibles",
    searchable,
    searchPlaceholder = "Buscar...",
    selectable,
    selectedKeys,
    onSelectionChange,
    pagination,
    sorting,
    onSearchChange,
    filters,
    onFilterChange,
    title,
    description,
    actions,
    toolbarActions,
    error,
  } = props as DataTableProps<T> & { rows?: T[]; data?: T[] };

  const isMobile = useIsMobile();
  const source = data ?? rows ?? [];

  const [internalSearch, setInternalSearch] = useState("");

  // Selection handling (controlled or uncontrolled)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set());
  const selection = selectedKeys ?? internalSelection;
  const setSelection = (s: Set<string>) => {
    if (onSelectionChange) onSelectionChange(s);
    else setInternalSelection(new Set(Array.from(s)));
  };

  const allVisibleRowKeys = useMemo(() => source.map((r) => (getRowKey ? getRowKey(r) : String(r.id ?? r.key ?? JSON.stringify(r)))) , [source, getRowKey]);

  const toggleSelectAll = () => {
    const newSet = new Set<string>();
    const allSelected = allVisibleRowKeys.every((k) => selection.has(k));
    if (!allSelected) {
      allVisibleRowKeys.forEach((k) => newSet.add(k));
    }
    setSelection(newSet);
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelection(next);
  };

  const getAlignmentClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }

    if (!onFilterChange) {
      next = next.filter((row) =>
        filters.every((filter) => {
          const raw = getValue(row, filter.key);
          const value = filterValues[filter.key];
          if (value === undefined || value === "" || value === null) return true;

          if (filter.type === "text") return normalize(raw).includes(normalize(value));
          if (filter.type === "select") return normalize(raw) === normalize(value);
          if (filter.type === "boolean") return String(Boolean(raw)) === String(value);
          if (filter.type === "date") {
            if (!raw) return false;
            return new Date(raw).toISOString().slice(0, 10) === value;
          }
          if (filter.type === "dateRange") {
            if (!raw) return false;
            const date = new Date(raw).getTime();
            const from = value?.from ? new Date(value.from).getTime() : Number.NEGATIVE_INFINITY;
            const to = value?.to ? new Date(value.to).getTime() : Number.POSITIVE_INFINITY;
            return date >= from && date <= to;
          }
          if (filter.type === "numberRange") {
            const number = Number(raw);
            const min = value?.min !== "" && value?.min != null ? Number(value.min) : Number.NEGATIVE_INFINITY;
            const max = value?.max !== "" && value?.max != null ? Number(value.max) : Number.POSITIVE_INFINITY;
            return Number.isFinite(number) && number >= min && number <= max;
          }
          return true;
        }),
      );
    }

    return next;
  }, [filterValues, filters, onFilterChange, onSearchChange, search, source]);

  const tableData = filteredData;
  const keys = useMemo(() => tableData.map((row) => rowKey(row, getRowKey)), [getRowKey, tableData]);
  const allSelected = keys.length > 0 && keys.every((key) => selection.has(key));
  const colSpan = columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0);
  const pageSizeOptions = pagination?.pageSizeOptions ?? [10, 20, 50, 100];
  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const displayedPage = pagination ? (pagination.page <= 0 ? pagination.page + 1 : pagination.page) : 1;

  const setSelection = (next: Set<string>) => {
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelection(next);
  };

  // Mobile column prioritization (legacy support)
  const highPriorityColumns = columns.filter((c) => c.priority === "high" || !c.priority);
  const mediumPriorityColumns = columns.filter((c) => c.priority === "medium");

  // Sorting header click
  const handleHeaderSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !sorting?.onSortChange) return;
    const key = String(col.key);
    const current = sorting?.sortKey === key ? sorting.direction : undefined;
    const nextDir = current === "asc" ? "desc" : "asc";
    sorting.onSortChange?.(key, nextDir);
  };

  // Render helpers
  const renderCell = (col: DataTableColumn<T>, row: T) => {
    if (col.render) return col.render(row);
    const k = col.key as keyof T;
    const v = row[k];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  // Search change
  const handleSearch = (v: string) => {
    setInternalSearch(v);
    onSearchChange?.(v);
  };

  // Render states
  if (isMobile) {
    return (
      <div className="space-y-4 md:hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4 rounded-3xl border border-slate-200/60 bg-white/50 dark:bg-zinc-900/55 dark:border-neutral-800/50 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500 dark:text-neutral-300">Cargando datos...</p>
          </div>
        ) : source.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 dark:bg-zinc-900/45 dark:border-neutral-800 backdrop-blur-sm">
            <Inbox className="w-10 h-10 text-slate-300 dark:text-neutral-400" />
            <p className="text-sm font-medium text-slate-500 dark:text-neutral-300">{error ?? emptyMessage}</p>
          </div>
        ) : (
          source.map((row) => {
            const key = getRowKey ? getRowKey(row) : String(row.id ?? row.key ?? JSON.stringify(row));
            return (
              <div key={key} className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-zinc-900 shadow-sm dark:border-neutral-800 transition-all hover:shadow-md active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/0 to-amber-50/50 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative p-5 space-y-4">
                  {highPriorityColumns[0] && (
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-widest">
                          {highPriorityColumns[0].header ?? highPriorityColumns[0].label}
                        </span>
                        <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                          {renderCell(highPriorityColumns[0], row)}
                        </div>
                      </div>
                      {selectable && (
                        <div>
                          <Checkbox
                            isSelected={selection.has(key)}
                            onValueChange={() => toggleSelect(key)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {highPriorityColumns.slice(1).map((column) => (
                      <div key={String(column.key)} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-400 uppercase tracking-widest">
                          {column.header ?? column.label}
                        </span>
                        <div className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                          {renderCell(column, row)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {mediumPriorityColumns.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex flex-wrap gap-x-4 gap-y-2">
                      {mediumPriorityColumns.map((column) => (
                        <div key={String(column.key)} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-400 uppercase tracking-tight">
                            {column.header ?? column.label}:
                          </span>
                          <span className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                            {renderCell(column, row)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {actions && <div className="pt-2">{actions(row)}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 dark:bg-zinc-900/65 dark:border-neutral-800/60 backdrop-blur-md shadow-sm hidden md:block animate-in fade-in duration-700">
      <div className="p-4 flex items-center justify-between gap-4">
        <div>
          {title ? <h3 className="text-lg font-semibold text-slate-900">{title}</h3> : null}
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {searchable && (
            <Input
              placeholder={searchPlaceholder}
              size="sm"
              variant="flat"
              className="max-w-xs"
              value={internalSearch}
              onChange={(e) => handleSearch((e.target as HTMLInputElement).value)}
            />
          )}
          {toolbarActions}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 dark:text-neutral-300 min-w-[800px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30">
              {selectable && (
                <th className="px-6 py-4 w-12">
                  <Checkbox
                    isSelected={allVisibleRowKeys.length > 0 && allVisibleRowKeys.every((k) => selection.has(k))}
                    onValueChange={toggleSelectAll}
                  />
                </th>
              )}
              {columns.map((column, idx) => (
                <th
                  key={String(column.key)}
                  onClick={() => handleHeaderSort(column)}
                  className={`px-6 py-4 font-bold text-[11px] uppercase tracking-[0.15em] text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 ${getAlignmentClass(column.align)} ${idx === 0 ? "pl-8" : ""} ${idx === columns.length - 1 ? "pr-8" : ""} ${column.headerClassName ?? ""}`}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2 select-none">
                    <span>{column.header ?? column.label}</span>
                    {column.sortable && sorting?.sortKey === String(column.key) ? (
                      <span className="text-xs">{sorting.direction === "asc" ? "▲" : "▼"}</span>
                    ) : null}
                  </div>
                </th>
              ) : null}
              {columns.map((column, index) => {
                const activeSort = sorting?.sortKey === String(column.key);
                return (
                  <th
                    key={String(column.key)}
                    scope="col"
                    style={{ width: column.width }}
                    onClick={() => handleSort(column)}
                    className={cn(
                      "border-b border-primary-400/35 px-5 py-3.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white",
                      column.sortable && "cursor-pointer select-none hover:bg-white/10",
                      alignClass[column.align ?? "left"],
                      index === 0 && !selectable && "first:rounded-tl-2xl",
                      index === columns.length - 1 && !actions && "last:rounded-tr-2xl",
                      column.headerClassName,
                    )}
                  >
                    <span className={cn("flex items-center gap-1.5", alignClass[column.align ?? "left"])}>
                      {column.header ?? column.label}
                      {column.sortable ? (
                        activeSort ? (
                          sorting?.direction === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-70" />
                        )
                      ) : null}
                    </span>
                  </th>
                );
              })}
              {actions ? (
                <th className="rounded-tr-2xl border-b border-primary-400/35 px-5 py-3.5 text-center text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-neutral-800">
            {error ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12">
                  <div className="flex items-center gap-3 text-rose-700">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{error}</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-20">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-8 h-8 border-3 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-400 dark:text-neutral-300">Sincronizando datos...</p>
                  </div>
                </td>
              </tr>
            ) : source.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-24">
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-60">
                    <div className="p-4 rounded-full bg-slate-50 border border-slate-100 dark:bg-zinc-900 dark:border-neutral-800">
                      <Inbox className="w-8 h-8 text-slate-300 dark:text-neutral-400" />
                    </div>
                    <p className="text-base font-medium text-slate-500 dark:text-neutral-300">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              source.map((row) => {
                const key = getRowKey ? getRowKey(row) : String(row.id ?? row.key ?? JSON.stringify(row));
                return (
                  <tr key={key} className="group hover:bg-slate-50/80 dark:hover:bg-neutral-800/35 transition-all duration-200 ease-out">
                    {selectable && (
                      <td className="px-6 py-4.5 whitespace-nowrap w-12">
                        <Checkbox isSelected={selection.has(key)} onValueChange={() => toggleSelect(key)} />
                      </td>
                    )}
                    {columns.map((column, idx) => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4.5 whitespace-nowrap transition-colors group-hover:text-slate-900 dark:group-hover:text-white ${getAlignmentClass(column.align)} ${idx === 0 ? "pl-8 font-semibold" : ""} ${idx === columns.length - 1 ? "pr-8" : ""} ${column.className ?? ""}`}
                        style={{ width: column.width }}
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

      {pagination ? (
        <div className="p-4 flex items-center justify-end">
          <Pagination
            total={pagination.total}
            page={pagination.page + 1}
            onChange={(p) => pagination.onPageChange(p - 1)}
            showControls
            showShadow
            color="primary"
          />
        </div>
      ) : null}
    </div>
  );
}
