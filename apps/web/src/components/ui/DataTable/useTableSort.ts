import { useMemo, useState, useCallback } from 'react';
import { SortDescriptor } from '@heroui/react';

export function useTableSort<T extends object>(
  source: T[],
  columns: Array<{ key: string | number | symbol; sortType?: "string" | "number" | "date" | "boolean" }>,
  controlled?: { descriptor?: SortDescriptor; onChange?: (d: SortDescriptor) => void },
  serverSide = false
) {
  const [internalDescriptor, setInternalDescriptor] = useState<SortDescriptor>();

  const sortDescriptor = controlled?.descriptor ?? internalDescriptor;
  const setSortDescriptor = controlled?.onChange ?? setInternalDescriptor;

  const sortedSource = useMemo(() => {
    if (serverSide || !sortDescriptor?.column || !sortDescriptor?.direction) return source;
    return [...source].sort((a, b) => {
      const col = columns.find((c) => String(c.key) === sortDescriptor.column);
      const key = sortDescriptor.column as keyof T;
      let cmp = 0;
      const aVal = a[key];
      const bVal = b[key];

      if (col?.sortType === "number") {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else if (col?.sortType === "date") {
        cmp = new Date(String(aVal || 0)).getTime() - new Date(String(bVal || 0)).getTime();
      } else if (col?.sortType === "boolean") {
        cmp = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, { numeric: true });
      }

      if (sortDescriptor.direction === "descending") cmp *= -1;
      return cmp;
    });
  }, [source, sortDescriptor, columns, serverSide]);

  return { sortedSource, sortDescriptor, setSortDescriptor };
}
