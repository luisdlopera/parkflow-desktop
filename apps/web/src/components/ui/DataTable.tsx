"use client";

import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { AlertCircle, Inbox } from "lucide-react";

type Column<T> = {
  key: keyof T | string;
  label: string;
  priority?: "high" | "medium" | "low";
  render?: (row: T) => string | number | React.ReactNode;
  align?: "left" | "center" | "right";
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
  rowKey?: (row: T, index: number) => string | number;
  isLoading?: boolean;
};

export default function DataTable<T extends object>({
  columns,
  rows,
  emptyMessage = "No hay datos disponibles",
  rowKey = (_, index) => index,
  isLoading = false,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

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

  const getAlignmentClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
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
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 dark:bg-gray-800/50 dark:border-gray-700 backdrop-blur-sm">
            <Inbox className="w-10 h-10 text-slate-300 dark:text-gray-400" />
            <p className="text-sm font-medium text-slate-500 dark:text-gray-300">{emptyMessage}</p>
          </div>
        ) : (
          rows.map((row, rowIndex) => (
            <div
              key={rowKey(row, rowIndex)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-gray-800 shadow-sm dark:border-gray-700 transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/0 to-amber-50/50 opacity-0 transition-opacity group-hover:opacity-100" />
              
              <div className="relative p-5 space-y-4">
                {/* Primary field - header style */}
                {highPriorityColumns[0] && (
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest">
                        {highPriorityColumns[0].label}
                      </span>
                      <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {highPriorityColumns[0].render
                          ? highPriorityColumns[0].render(row)
                          : String(row[highPriorityColumns[0].key as keyof T] ?? "")}
                      </div>
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
                )}

                {/* Other high priority fields in a grid */}
                <div className="grid grid-cols-2 gap-4">
                  {highPriorityColumns.slice(1).map((column) => (
                    <div key={String(column.key)} className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest">
                        {column.label}
                      </span>
                      <div className="text-sm font-medium text-slate-700 dark:text-gray-300">
                        {column.render 
                          ? column.render(row) 
                          : String(row[column.key as keyof T] ?? "")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Medium priority fields - subtle footer */}
                {mediumPriorityColumns.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-2">
                    {mediumPriorityColumns.map((column) => (
                      <div key={String(column.key)} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-tight">
                          {column.label}:
                        </span>
                        <span className="text-xs font-medium text-slate-600 dark:text-gray-300">
                          {column.render 
                            ? column.render(row) 
                            : String(row[column.key as keyof T] ?? "")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
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
                  {column.label}
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
            ) : rows.length === 0 ? (
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
              rows.map((row, rowIndex) => (
                <tr
                  key={rowKey(row, rowIndex)}
                  className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/60 transition-all duration-200 ease-out"
                >
                  {columns.map((column, idx) => (
                    <td 
                      key={String(column.key)} 
                      className={`px-6 py-4.5 whitespace-nowrap transition-colors group-hover:text-slate-900 dark:group-hover:text-white ${getAlignmentClass(column.align)} ${idx === 0 ? "pl-8 font-semibold" : ""} ${idx === columns.length - 1 ? "pr-8" : ""}`}
                    >
                      {column.render 
                        ? column.render(row) 
                        : String(row[column.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
