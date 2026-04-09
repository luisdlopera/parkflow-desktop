type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => string | number | React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
};

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  rows
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-100/60 text-xs uppercase tracking-[0.3em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200/60">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-3">
                  {column.render ? column.render(row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
