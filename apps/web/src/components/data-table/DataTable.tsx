'use client';

import { useRef, useCallback } from 'react';
import { flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Skeleton, Spinner } from '@heroui/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Database } from 'lucide-react';
import { DataTableProps } from './types';
import { useDataTable } from './hooks/useDataTable';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTablePagination } from './DataTablePagination';
import { DataTableBulkActions } from './DataTableBulkActions';

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

  const { rows } = table.getRowModel();

  // Virtualization
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // Estimación de altura de fila (48px)
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
        className={`relative w-full border border-divider rounded-lg bg-content1 overflow-auto ${
          enableVirtualization ? 'max-h-[600px]' : ''
        }`}
      >
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-default-500 uppercase bg-content2 sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className="px-4 py-3 font-medium whitespace-nowrap group select-none"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${
                            canSort ? 'cursor-pointer hover:text-default-900' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="text-default-300">
                              {{
                                asc: <ArrowUp size={14} className="text-primary" />,
                                desc: <ArrowDown size={14} className="text-primary" />,
                              }[isSorted as string] ?? (
                                <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Database size={48} className="text-default-200" />
                    {emptyStateContent || <p>No se encontraron resultados.</p>}
                  </div>
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
                    {row.getVisibleCells().map((cell) => (
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
                    ))}
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
                  {row.getVisibleCells().map((cell) => (
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
                  ))}
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
