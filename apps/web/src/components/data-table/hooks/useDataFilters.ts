import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterState } from '../types';
import { serializeUrlState, deserializeUrlState } from '../utils/url-state';

export function useDataFilters(tableName: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Internal state to avoid constant URL parsing on every render
  const [filters, setFilters] = useState<FilterState[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string>('');

  // Sync from URL to state on mount and when URL changes
  useEffect(() => {
    const filtersParam = searchParams.get(`${tableName}_filters`);
    const qParam = searchParams.get(`${tableName}_q`);

    if (filtersParam) {
      setFilters(deserializeUrlState<FilterState[]>(filtersParam, []));
    }
    if (qParam) {
      setGlobalFilter(qParam);
    }
  }, [searchParams, tableName]);

  // Update URL when state changes
  const updateUrl = useCallback(
    (newFilters: FilterState[], newGlobalFilter: string) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      if (newFilters.length > 0) {
        current.set(`${tableName}_filters`, serializeUrlState(`${tableName}_filters`, newFilters));
      } else {
        current.delete(`${tableName}_filters`);
      }

      if (newGlobalFilter) {
        current.set(`${tableName}_q`, newGlobalFilter);
      } else {
        current.delete(`${tableName}_q`);
      }

      const search = current.toString();
      const query = search ? `?${search}` : '';
      router.push(`${window.location.pathname}${query}`, { scroll: false });
    },
    [router, searchParams, tableName]
  );

  const applyFilters = useCallback((newFilters: FilterState[]) => {
    setFilters(newFilters);
    updateUrl(newFilters, globalFilter);
  }, [globalFilter, updateUrl]);

  const applyGlobalFilter = useCallback((q: string) => {
    setGlobalFilter(q);
    updateUrl(filters, q);
  }, [filters, updateUrl]);

  return {
    filters,
    globalFilter,
    applyFilters,
    applyGlobalFilter,
  };
}
