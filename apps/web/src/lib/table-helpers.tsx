/**
 * Table column and rendering utilities to reduce duplication in DataTable usage.
 */

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: number;
}

/**
 * Status column renderer — returns green badge for active, gray for inactive.
 * Replaces the 8+ reimplementations of:
 *   render: (r) => <span className={r.isActive ? "bg-emerald-100..." : "bg-slate-100..."}>...
 */
export function statusColumn<T extends { isActive?: boolean; active?: boolean }>(
  key: keyof T,
  label: string = 'Estado',
): ColumnDef<T> {
  return {
    key,
    label,
    render: (row: T) => {
      const isActive = row.isActive ?? row.active ?? false;
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isActive ? 'Sí' : 'No'}
        </span>
      );
    },
  };
}

/**
 * Date column renderer — formats ISO string to locale string.
 */
export function dateColumn<T extends Record<string, unknown>>(
  key: keyof T,
  label: string,
  locale: string = 'es-CO',
): ColumnDef<T> {
  return {
    key,
    label,
    render: (row: T) => {
      const val = row[key];
      if (!val) return '—';
      try {
        return new Date(val as string).toLocaleString(locale);
      } catch {
        return String(val);
      }
    },
  };
}
