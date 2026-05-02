"use client";

import { useIsMobile } from "@/lib/hooks/useMediaQuery";

type Column<T> = {
  key: keyof T;
  label: string;
  priority?: "high" | "medium" | "low";
  render?: (row: T) => string | number | React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string | number;
};

export default function DataTable<T extends object>({
  columns,
  rows,
  emptyMessage = "No hay datos disponibles",
  rowKey = (_, index) => index,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  // Separate columns by priority for mobile
  const highPriorityColumns = columns.filter((c) => c.priority === "high" || !c.priority);
  const mediumPriorityColumns = columns.filter((c) => c.priority === "medium");
  const lowPriorityColumns = columns.filter((c) => c.priority === "low");

  // For mobile, show only high priority columns in a card view
  if (isMobile) {
    return (
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row, rowIndex) => (
            <div
              key={rowKey(row, rowIndex)}
              className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 space-y-2"
            >
              {/* Primary field - larger and bolder */}
              {highPriorityColumns[0] && (
                <div className="pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    {highPriorityColumns[0].label}
                  </span>
                  <div className="text-lg font-semibold text-slate-900">
                    {highPriorityColumns[0].render
                      ? highPriorityColumns[0].render(row)
                      : String(row[highPriorityColumns[0].key])}
                  </div>
                </div>
              )}

              {/* Other high priority fields */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {highPriorityColumns.slice(1).map((column) => (
                  <div key={String(column.key)}>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {column.label}
                    </span>
                    <div className="text-sm text-slate-700">
                      {column.render ? column.render(row) : String(row[column.key])}
                    </div>
                  </div>
                ))}
              </div>

              {/* Medium priority fields - smaller */}
              {mediumPriorityColumns.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  {mediumPriorityColumns.map((column) => (
                    <div key={String(column.key)} className="text-xs">
                      <span className="text-slate-400">{column.label}:</span>{" "}
                      <span className="text-slate-600">
                        {column.render ? column.render(row) : String(row[column.key])}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // Desktop/Tablet view - scrollable table
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/80 hidden md:block">
      <table className="w-full text-left text-sm text-slate-700 min-w-[600px]">
        <thead className="bg-slate-100/60 text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 whitespace-nowrap">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowKey(row, rowIndex)}
                className="border-t border-slate-200/60 hover:bg-slate-50/50 transition-colors"
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 whitespace-nowrap">
                    {column.render ? column.render(row) : String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
