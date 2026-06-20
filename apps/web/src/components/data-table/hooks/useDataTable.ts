import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  SortingState,
  PaginationState as TanStackPaginationState,
  ColumnDef,
  RowSelectionState,
  VisibilityState,
  ColumnOrderState,
} from '@tanstack/react-table';
import { FetchDataParams, FetchDataResult } from '../types';
import { useDataFilters } from './useDataFilters';

export function useDataTable<TData, TValue>(
  tableName: string,
  columns: ColumnDef<TData, TValue>[],
  fetchData: (params: FetchDataParams) => Promise<FetchDataResult<TData>>,
  initialPageSize: number = 20
) {
  const [data, setData] = useState<TData[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Sorting
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Pagination
  const [pagination, setPagination] = useState<TanStackPaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  // Row Selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isAllSelected, setIsAllSelected] = useState(false); // For massive selection across pages

  // Column Visibility & Order
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);

  // Local storage for column preferences
  useEffect(() => {
    const savedVisibility = localStorage.getItem(`parkflow_table_${tableName}_visibility`);
    const savedOrder = localStorage.getItem(`parkflow_table_${tableName}_order`);
    if (savedVisibility) setColumnVisibility(JSON.parse(savedVisibility));
    if (savedOrder) setColumnOrder(JSON.parse(savedOrder));
  }, [tableName]);

  const handleColumnVisibilityChange = useCallback((updater: any) => {
    setColumnVisibility((old) => {
      const newVal = typeof updater === 'function' ? updater(old) : updater;
      localStorage.setItem(`parkflow_table_${tableName}_visibility`, JSON.stringify(newVal));
      return newVal;
    });
  }, [tableName]);

  const handleColumnOrderChange = useCallback((updater: any) => {
    setColumnOrder((old) => {
      const newVal = typeof updater === 'function' ? updater(old) : updater;
      localStorage.setItem(`parkflow_table_${tableName}_order`, JSON.stringify(newVal));
      return newVal;
    });
  }, [tableName]);

  // Filters hook
  const { filters, globalFilter, applyFilters, applyGlobalFilter } = useDataFilters(tableName);

  // Fetch Data Effect
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchData({
          pagination: {
            pageIndex: pagination.pageIndex, // keep 0-indexed internally, adapter must +1 if backend needs 1-indexed
            pageSize: pagination.pageSize
          },
          sorting,
          filters,
          globalFilter
        });
        if (isMounted) {
          setData(result.data);
          setPageCount(result.pageCount);
          setRowCount(result.rowCount);
        }
      } catch (error) {
        console.error('Error fetching table data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchData, pagination.pageIndex, pagination.pageSize, sorting, filters, globalFilter]);

  // Reset row selection if filters/sorting change (Enterprise best practice)
  useEffect(() => {
    setRowSelection({});
    setIsAllSelected(false);
  }, [filters, globalFilter, sorting]);

  const selectAllAcrossPages = useCallback(() => {
    setIsAllSelected(true);
    // When massive selection is on, we don't necessarily select rows in `rowSelection`,
    // or we mark all current page rows as selected visually.
    const newSelection: RowSelectionState = {};
    data.forEach((_, index) => {
      newSelection[index] = true;
    });
    setRowSelection(newSelection);
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: (updater) => {
      setIsAllSelected(false); // If user manually changes selection, we disable "massive" selection
      setRowSelection(updater);
    },
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onColumnOrderChange: handleColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return {
    table,
    data,
    rowCount,
    isLoading,
    filters,
    globalFilter,
    applyFilters,
    applyGlobalFilter,
    isAllSelected,
    selectAllAcrossPages
  };
}
