'use client';

import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Skeleton, Spinner } from '@heroui/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { DataTableProps } from './types';
import { useDataTable } from './hooks/useDataTable';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { DataTableBulkActions } from './DataTableBulkActions';
import { DataTableEmptyState } from './DataTableEmptyState';

export function DataTable<TData, TValue>({
  columns,
  fetchData,
  filterDefinitions,
  bulkActions,
  tableName,
  enableVirtualization = false,
  exportConfig,
  onRowClick,
  emptyStateContent,
}: DataTableProps<TData, TValue>) {
  const {
    table,
    data,
    rowCount,
    isLoading,
    filters,
    globalFilter,
    applyFilters,
    applyGlobalFilter,
    isAllSelected,
    selectAllAcrossPages,
  } = useDataTable(tableName, columns, fetchData);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and on resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // Tailwind sm breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { rows } = table.getRowModel();

  // Virtualization
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleRowClick = useCallback(
    (row: TData) => {
      if (onRowClick) {
        onRowClick(row);
      }
    },
    [onRowClick]
  );

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div className="flex flex-col w-full h-full space-y-4">
      <DataTableToolbar
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={applyGlobalFilter}
        filterDefinitions={filterDefinitions}
        exportConfig={exportConfig}
        filters={filters}
        onFiltersChange={applyFilters}
      />

      <div
        ref={tableContainerRef}
        className={`relative w-full border border-default-200 rounded-xl bg-content1 overflow-auto transition-all ${
          enableVirtualization ? 'max-h-[600px]' : ''
        }`}
      >
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-default-500 uppercase bg-content2 sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  // On mobile, hide low-priority columns
                  const columnDef = header.column.columnDef as any;
                  const priority = columnDef.priority || 'high';
                  if (isMobile && priority === 'low') {
                    return null;
                  }

                  const isSorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="px-4 py-3 font-medium whitespace-nowrap group select-none"
                      style={{ width: header.getSize() }}
                      role="columnheader"
                      aria-sort={
                        isSorted === 'asc'
                          ? 'ascending'
                          : isSorted === 'desc'
                          ? 'descending'
                          : 'none'
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${
                            canSort ? 'cursor-pointer hover:text-default-900' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                          title={canSort ? 'Click to sort' : undefined}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="text-default-300 flex-shrink-0">
                              {{
                                asc: <ArrowUp size={14} className="text-primary" aria-label="Sorted ascending" />,
                                desc: <ArrowDown size={14} className="text-primary" aria-label="Sorted descending" />,
                              }[isSorted as string] ?? (
                                <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Sortable" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody
            className="divide-y divide-divider"
            style={
              enableVirtualization
                ? { height: `${totalSize}px`, position: 'relative' }
                : {}
            }
          >
            {isLoading && data.length === 0 ? (
              // Initial Loading State (Skeletons)
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  {table.getVisibleFlatColumns().map((col) => (
                    <td key={col.id} className="px-4 py-4">
                      <Skeleton className="w-full h-4 rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={table.getVisibleFlatColumns().length}
                  className="px-4 py-12 text-center text-default-500"
                >
                  {emptyStateContent ? (
                    <>{emptyStateContent}</>
                  ) : (
                    <DataTableEmptyState
                      hasFilters={!!globalFilter || filters.length > 0}
                      filterCount={filters.length}
                    />
                  )}
                </td>
              </tr>
            ) : enableVirtualization ? (
              // Virtualized Rows
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    className={`absolute w-full flex transition-colors hover:bg-default-100 ${
                      row.getIsSelected() ? 'bg-primary-50/50' : ''
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                    style={{
                      top: 0,
                      left: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`,
                    }}
                    onClick={() => handleRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const columnDef = cell.column.columnDef as any;
                      const priority = columnDef.priority || 'high';
                      if (isMobile && priority === 'low') {
                        return null;
                      }
                      return (
                        <td
                          key={cell.id}
                          className="px-4 py-3 flex items-center"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              // Standard Rows
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-default-100 ${
                    row.getIsSelected() ? 'bg-primary-50/50' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const columnDef = cell.column.columnDef as any;
                    const priority = columnDef.priority || 'high';
                    if (isMobile && priority === 'low') {
                      return null;
                    }
                    return (
                      <td
                        key={cell.id}
                        className="px-4 py-3"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Overlay spinner when loading subsequent pages */}
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Spinner color="accent" />
          </div>
        )}
      </div>

      <DataTablePagination table={table} rowCount={rowCount} />

      <DataTableBulkActions
        table={table}
        bulkActions={bulkActions}
        isAllSelected={isAllSelected}
        onSelectAllAcrossPages={selectAllAcrossPages}
        rowCount={rowCount}
      />
    </div>
  );
}
