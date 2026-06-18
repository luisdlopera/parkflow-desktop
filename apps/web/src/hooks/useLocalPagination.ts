import { useState, useMemo } from "react";
import { useDebounce } from "./useDebounce";

interface UseLocalPaginationOptions<T> {
  data: T[] | undefined;
  initialPageSize?: number;
  searchFields?: (keyof T)[];
}

export function useLocalPagination<T>({
  data,
  initialPageSize = 10,
  searchFields = [],
}: UseLocalPaginationOptions<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const processedData = useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    // 1. Search
    if (debouncedSearchQuery && searchFields.length > 0) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        searchFields.some((field) => {
          const val = item[field];
          return val != null && String(val).toLowerCase().includes(query);
        })
      );
    }

    // 2. Filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return;
      const selectedValues = value.split(",");
      filtered = filtered.filter((item) => {
        const itemVal = String(item[key as keyof T]);
        return selectedValues.includes(itemVal);
      });
    });

    return filtered;
  }, [data, debouncedSearchQuery, activeFilters, searchFields]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize]);

  return {
    // Data
    paginatedData,
    totalItems: processedData.length,
    // State
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    // Handlers
    handlePaginationChange: (newPage: number, newPageSize?: number) => {
      setPage(newPage);
      if (newPageSize && newPageSize !== pageSize) {
        setPageSize(newPageSize);
      }
    },
  };
}
