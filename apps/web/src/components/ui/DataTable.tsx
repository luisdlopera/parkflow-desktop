"use client";

import React, { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Pagination,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  Inbox,
  Loader2,
  Search,
  X,
} from "lucide-react";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header?: string;
  label?: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  width?: string;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
  priority?: "high" | "medium" | "low";
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
  data?: T[];
  rows?: T[];
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

const alignClass = {
  left: "text-left justify-start",
  center: "text-center justify-center",
  right: "text-right justify-end",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getValue<T extends Record<string, any>>(row: T, key: keyof T | string) {
  return row[key as keyof T];
}

function rowKey<T extends Record<string, any>>(row: T, getRowKey?: (row: T) => string) {
  return getRowKey ? getRowKey(row) : String(row.id ?? row.key ?? JSON.stringify(row));
}

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase();
}

export default function DataTable<T extends Record<string, any>>({
  title,
  description,
  columns,
  data,
  rows,
  getRowKey,
  isLoading = false,
  error = null,
  emptyMessage = "No hay datos disponibles",
  actions,
  filters = [],
  searchable = false,
  searchPlaceholder = "Buscar...",
  selectable = false,
  selectedKeys,
  onSelectionChange,
  pagination,
  sorting,
  onSearchChange,
  onFilterChange,
  toolbarActions,
}: DataTableProps<T>) {
  const source = useMemo(() => data ?? rows ?? [], [data, rows]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set());
  const selection = selectedKeys ?? internalSelection;
  const hasToolbar = Boolean(title || description || searchable || filters.length || toolbarActions);

  const visibleColumns = useMemo(
    () => columns.filter((column) => !column.hideOnMobile),
    [columns],
  );

  const filteredData = useMemo(() => {
    let next = source;

    if (!onSearchChange && search.trim()) {
      const query = search.trim().toLowerCase();
      next = next.filter((row) => Object.values(row).some((value) => normalize(value).includes(query)));
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

  const updateFilter = (key: string, value: any) => {
    const next = { ...filterValues, [key]: value };
    setFilterValues(next);
    onFilterChange?.(next);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterValues({});
    onSearchChange?.("");
    onFilterChange?.({});
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !sorting?.onSortChange) return;
    const key = String(column.key);
    const direction = sorting.sortKey === key && sorting.direction === "asc" ? "desc" : "asc";
    sorting.onSortChange(key, direction);
  };

  const renderCell = (column: DataTableColumn<T>, row: T) => {
    if (column.render) return column.render(row);
    const value = getValue(row, column.key);
    if (value === null || value === undefined || value === "") {
      return <span className="text-default-400">-</span>;
    }
    return String(value);
  };

  const renderFilter = (filter: DataTableFilter) => {
    const value = filterValues[filter.key];

    if (filter.type === "select" || filter.type === "boolean") {
      const options =
        filter.type === "boolean"
          ? [
              { label: "Si", value: "true" },
              { label: "No", value: "false" },
            ]
          : filter.options ?? [];

      return (
        <Select
          key={filter.key}
          label={filter.label}
          size="sm"
          variant="bordered"
          selectedKeys={value ? [String(value)] : []}
          onChange={(event) => updateFilter(filter.key, event.target.value)}
          className="min-w-44"
        >
          {options.map((option) => (
            <SelectItem key={option.value} textValue={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      );
    }

    if (filter.type === "dateRange") {
      return (
        <div key={filter.key} className="grid min-w-72 grid-cols-2 gap-2">
          <Input
            label={`${filter.label} desde`}
            type="date"
            size="sm"
            variant="bordered"
            value={value?.from ?? ""}
            onChange={(event) => updateFilter(filter.key, { ...value, from: event.target.value })}
          />
          <Input
            label="Hasta"
            type="date"
            size="sm"
            variant="bordered"
            value={value?.to ?? ""}
            onChange={(event) => updateFilter(filter.key, { ...value, to: event.target.value })}
          />
        </div>
      );
    }

    if (filter.type === "numberRange") {
      return (
        <div key={filter.key} className="grid min-w-64 grid-cols-2 gap-2">
          <Input
            label={`${filter.label} min`}
            type="number"
            size="sm"
            variant="bordered"
            value={value?.min ?? ""}
            onChange={(event) => updateFilter(filter.key, { ...value, min: event.target.value })}
          />
          <Input
            label="Max"
            type="number"
            size="sm"
            variant="bordered"
            value={value?.max ?? ""}
            onChange={(event) => updateFilter(filter.key, { ...value, max: event.target.value })}
          />
        </div>
      );
    }

    return (
      <Input
        key={filter.key}
        label={filter.label}
        type={filter.type === "date" ? "date" : "text"}
        size="sm"
        variant="bordered"
        value={value ?? ""}
        onChange={(event) => updateFilter(filter.key, event.target.value)}
        className="min-w-48"
      />
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      {hasToolbar ? (
        <div className="border-b border-slate-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              {title ? (
                <h3 className="text-base font-semibold text-slate-950 dark:text-zinc-50">{title}</h3>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{description}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {searchable ? (
                <Input
                  aria-label="Buscar en tabla"
                  placeholder={searchPlaceholder}
                  size="sm"
                  variant="bordered"
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  startContent={<Search className="h-4 w-4 text-default-400" />}
                  className="w-full sm:w-80"
                />
              ) : null}
              {filters.length ? (
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<Filter className="h-4 w-4" />}
                  endContent={filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  onPress={() => setFiltersOpen((open) => !open)}
                >
                  Filtros
                </Button>
              ) : null}
              {toolbarActions}
            </div>
          </div>
          {filters.length && filtersOpen ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex flex-wrap items-end gap-3">
                {filters.map(renderFilter)}
                <Button
                  size="sm"
                  variant="light"
                  startContent={<X className="h-4 w-4" />}
                  onPress={clearFilters}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-0 text-sm text-slate-700 dark:text-zinc-200">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {selectable ? (
                <th className="w-12 px-5 py-3.5 text-left first:rounded-tl-2xl">
                  <Checkbox
                    aria-label="Seleccionar todas las filas"
                    isSelected={allSelected}
                    onValueChange={() => {
                      const next = new Set<string>();
                      if (!allSelected) keys.forEach((key) => next.add(key));
                      setSelection(next);
                    }}
                  />
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
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {error ? (
              <tr>
                <td colSpan={colSpan} className="px-6 py-12">
                  <div className="flex items-center justify-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-5 text-danger dark:border-danger-500/30 dark:bg-danger-500/10">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{error}</span>
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-6 py-16">
                  <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-zinc-400">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Cargando datos...</span>
                  </div>
                </td>
              </tr>
            ) : tableData.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-6 py-16">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                    <div className="rounded-full border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <Inbox className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-700 dark:text-zinc-200">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              tableData.map((row, rowIndex) => {
                const key = rowKey(row, getRowKey);
                return (
                  <tr
                    key={key}
                    className={cn(
                      "group transition-colors hover:bg-primary-50/65 dark:hover:bg-primary-500/10",
                      rowIndex % 2 === 1 && "bg-slate-50/55 dark:bg-zinc-900/35",
                    )}
                  >
                    {selectable ? (
                      <td className="w-12 px-5 py-4">
                        <Checkbox
                          aria-label={`Seleccionar fila ${key}`}
                          isSelected={selection.has(key)}
                          onValueChange={() => {
                            const next = new Set(selection);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            setSelection(next);
                          }}
                        />
                      </td>
                    ) : null}
                    {columns.map((column, index) => (
                      <td
                        key={String(column.key)}
                        style={{ width: column.width }}
                        className={cn(
                          "px-5 py-4 align-middle text-slate-700 dark:text-zinc-200",
                          alignClass[column.align ?? "left"],
                          index === 0 && "font-medium text-slate-950 dark:text-zinc-50",
                          column.className,
                        )}
                      >
                        {renderCell(column, row)}
                      </td>
                    ))}
                    {actions ? <td className="px-5 py-4 text-center">{actions(row)}</td> : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden dark:divide-zinc-800">
        {error ? (
          <div className="m-4 rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm font-medium text-danger dark:border-danger-500/30 dark:bg-danger-500/10">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center gap-3 p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Cargando datos...</span>
          </div>
        ) : tableData.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <Inbox className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-600 dark:text-zinc-300">{emptyMessage}</p>
          </div>
        ) : (
          tableData.map((row) => {
            const key = rowKey(row, getRowKey);
            return (
              <article key={key} className="p-4">
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        {visibleColumns[0]?.header ?? visibleColumns[0]?.label}
                      </p>
                      <div className="mt-1 text-base font-semibold text-slate-950 dark:text-zinc-50">
                        {visibleColumns[0] ? renderCell(visibleColumns[0], row) : key}
                      </div>
                    </div>
                    {selectable ? (
                      <Checkbox
                        aria-label={`Seleccionar fila ${key}`}
                        isSelected={selection.has(key)}
                        onValueChange={() => {
                          const next = new Set(selection);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          setSelection(next);
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {visibleColumns.slice(1).map((column) => (
                      <div key={String(column.key)}>
                        <p className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                          {column.header ?? column.label}
                        </p>
                        <div className="mt-1 text-sm text-slate-700 dark:text-zinc-200">{renderCell(column, row)}</div>
                      </div>
                    ))}
                  </div>
                  {actions ? <div className="border-t border-slate-100 pt-3 dark:border-zinc-800">{actions(row)}</div> : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {pagination ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {pagination.total} registros
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {pagination.onPageSizeChange ? (
              <Select
                aria-label="Filas por pagina"
                size="sm"
                variant="bordered"
                selectedKeys={[String(pagination.pageSize)]}
                onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
                className="w-32"
              >
                {pageSizeOptions.map((option) => (
                  <SelectItem key={String(option)} textValue={String(option)}>
                    {option} / pág.
                  </SelectItem>
                ))}
              </Select>
            ) : null}
            <Pagination
              total={pageCount}
              page={displayedPage}
              onChange={(nextPage) => pagination.onPageChange(pagination.page <= 0 ? nextPage - 1 : nextPage)}
              showControls
              showShadow
              color="primary"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
