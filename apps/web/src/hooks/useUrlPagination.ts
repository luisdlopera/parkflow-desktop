import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "./useDebounce";

interface UseUrlPaginationOptions<T> {
  data: T[] | undefined;
  initialPageSize?: number;
  searchFields?: (keyof T)[];
}

export function useUrlPagination<T>({
  data,
  initialPageSize = 10,
  searchFields = [],
}: UseUrlPaginationOptions<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlPage = Number(searchParams.get("page")) || 1;
  const urlPageSize = Number(searchParams.get("pageSize")) || initialPageSize;
  const urlSearch = searchParams.get("q") || "";

  // Mantenemos el input en estado local para no bloquear la escritura, pero sincronizamos con la URL al hacer debounce
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sincronizar el debounce con la URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
      params.set("page", "1"); // reset page on new search
    } else {
      params.delete("q");
    }
    const newQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (newQuery !== currentQuery) {
      router.replace(`${pathname}?${newQuery}`, { scroll: false });
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  // Sincronizar el initial state si se entra con URL params
  useEffect(() => {
    if (urlSearch !== debouncedSearch) {
      setSearchInput(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const processedData = useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    // 1. Search
    if (urlSearch && searchFields.length > 0) {
      const query = urlSearch.toLowerCase();
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
  }, [data, urlSearch, activeFilters, searchFields]);

  const paginatedData = useMemo(() => {
    const start = (urlPage - 1) * urlPageSize;
    return processedData.slice(start, start + urlPageSize);
  }, [processedData, urlPage, urlPageSize]);

  const handlePaginationChange = (newPage: number, newPageSize?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    if (newPageSize && newPageSize !== urlPageSize) {
      params.set("pageSize", newPageSize.toString());
      params.set("page", "1"); // reset page when page size changes
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return {
    paginatedData,
    totalItems: processedData.length,
    searchQuery: searchInput,
    setSearchQuery: setSearchInput,
    activeFilters,
    setActiveFilters,
    page: urlPage,
    pageSize: urlPageSize,
    handlePaginationChange,
  };
}
