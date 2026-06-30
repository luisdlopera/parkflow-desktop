"use client";

import React, { useMemo, useState, useCallback, useRef, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Pagination,
  Table,
  ListBox,
  EmptyState,
  Checkbox as HeroCheckbox,
  cn,
  useFilter,
  SearchField,
  Label,
  Dropdown,
  Button,
  Chip,
  type SortDescriptor,
  type Selection,
  type Key,
} from "@heroui/react";
import { Input } from "@/components/bridge/Input";
import { Autocomplete } from "@/components/bridge/Autocomplete";
import { ChevronUp, Inbox, Search, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DataTableCellRenderer } from "@/components/data-table/DataTableCellRenderer";
import type { DataTableColumn as SolvyColumn } from "@/components/data-table/types";

export type DataTableColumn<T> = {
  key: keyof T | (string & {});
  label?: string;
  header?: string;
  priority?: "high" | "medium" | "low";
  sortable?: boolean;
  sortType?: "string" | "number" | "date" | "boolean";
  /** @deprecated Use `type` instead. Legacy format for backward compatibility. */
  format?: "currency" | "datetime" | "date" | "boolean" | "badge";
  /** Column type for the new cell renderer system. Falls back to `format` if not set. */
  type?: SolvyColumn["type"];
  /** Options for the new cell renderer system. */
  options?: SolvyColumn["options"];
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  resizable?: boolean;
  width?: number | string;
  minWidth?: number;
};

type FilterConfig = {
  key: string;
  label: string;
  type: "text" | "select" | "boolean" | "date" | "dateRange" | "numberRange";
  options?: { label: string; value: string }[];
};

export type SearchConfig = {
  enabled?: boolean;
  placeholder?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  isClearable?: boolean;
  startIcon?: React.ReactNode;
  className?: string;
  onChange?: (query: string) => void;
};

export type DataTableProps<T> = {
  title?: string;
  description?: string;
  columns: DataTableColumn<T>[];
  data?: T[];
  rows?: T[];
  getRowKey?: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string | number;
  searchConfig?: SearchConfig;
  /** @deprecated Use searchConfig instead */
  searchable?: boolean;
  /** @deprecated Use searchConfig instead */
  searchPlaceholder?: string;
  /** @deprecated Use searchConfig instead */
  onSearchChange?: (query: string) => void;
  filters?: FilterConfig[];
  onFilterChange?: (values: Record<string, string>) => void;
  actions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onRowSelectionChange?: (keys: Set<string>) => void;
  onSelectAll?: (keys: Set<string>) => void;
  resizable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: number[];
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  serverSide?: boolean;
  exportOptions?: {
    csv?: boolean;
    excel?: boolean;
    onExport?: (type: "csv" | "excel") => void;
  };
  hideColumnsToggle?: boolean;
  syncWithUrl?: boolean;
};

function SortableHeader({
  children,
  sortDirection,
}: {
  children: React.ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center gap-1">
      {children}
      {!!sortDirection && (
        <ChevronUp
          className={cn(
            "size-3 transform transition-transform duration-100 ease-out",
            sortDirection === "descending" ? "rotate-180" : "",
          )}
        />
      )}
    </span>
  );
}

function getDisplayLabel<T>(column: DataTableColumn<T>) {
  return column.label ?? column.header ?? String(column.key);
}

function getAlignClass(align?: "left" | "center" | "right") {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

function getPriorityClass(priority?: "high" | "medium" | "low") {
  switch (priority) {
    case "low":
      return "hidden lg:table-cell";
    case "medium":
      return "hidden md:table-cell";
    default:
      return "";
  }
}

function DataTableInner<T extends object>({
  columns,
  data,
  rows,
  emptyMessage = "No hay datos disponibles",
  rowKey = (_, index) => index,
  getRowKey,
  isLoading = false,
  actions,
  pagination: paginationConfig,
  onPaginationChange,
  searchConfig,
  searchable,
  searchPlaceholder = "Buscar...",
  onSearchChange,
  filters,
  onFilterChange,
  selectable,
  selectedKeys: controlledSelectedKeys,
  onRowSelectionChange,
  onSelectAll,
  resizable = false,
  sortDescriptor: controlledSortDescriptor,
  onSortChange: controlledOnSortChange,
  serverSide = false,
  exportOptions,
  hideColumnsToggle,
  syncWithUrl = false,
}: DataTableProps<T>) {
  const { contains } = useFilter({ sensitivity: "base" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visibleColumns, setVisibleColumns] = useState<Selection>("all");

  const source = useMemo(() => data ?? rows ?? [], [data, rows]);
  const [internalSortDescriptor, setInternalSortDescriptor] = useState<SortDescriptor>();
  
  const sortDescriptor = controlledSortDescriptor ?? internalSortDescriptor;
  const setSortDescriptor = controlledOnSortChange ?? setInternalSortDescriptor;

  const sortedSource = useMemo(() => {
    if (serverSide || !sortDescriptor?.column || !sortDescriptor?.direction) return source;

    // ⚡ Bolt: Extract O(N) column lookup outside the O(N log N) sort callback to prevent redundant operations
    const col = columns.find((c) => String(c.key) === sortDescriptor.column);
    const key = sortDescriptor.column as keyof T;

    return [...source].sort((a, b) => {
      let cmp = 0;

      const aVal = a[key];
      const bVal = b[key];

      if (col?.sortType === "number") {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else if (col?.sortType === "date") {
        cmp =
          new Date(String(aVal || 0)).getTime() -
          new Date(String(bVal || 0)).getTime();
      } else if (col?.sortType === "boolean") {
        cmp = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, {
          numeric: true,
        });
      }

      if (sortDescriptor.direction === "descending") cmp *= -1;
      return cmp;
    });
  }, [source, sortDescriptor, columns, serverSide]);

  const VIRTUALIZATION_THRESHOLD = 100;
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = sortedSource.length > VIRTUALIZATION_THRESHOLD && !isLoading && source.length > 0;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? sortedSource.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const getKey = useCallback((row: T, index: number) =>
    getRowKey ? getRowKey(row) : String(rowKey(row, index)),
  [getRowKey, rowKey]);

  const selection = useMemo<Selection>(() => {
    if (!selectable) return new Set();
    if (controlledSelectedKeys) return controlledSelectedKeys;
    return new Set<string>();
  }, [selectable, controlledSelectedKeys]);

  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === "all") {
        const allKeys = new Set(
          sortedSource.map((row, i) => getKey(row, i)),
        );
        onRowSelectionChange?.(allKeys);
        onSelectAll?.(allKeys);
      } else {
        const setKeys = keys as Set<string>;
        onRowSelectionChange?.(setKeys);
        onSelectAll?.(setKeys);
      }
    },
    [sortedSource, getKey, onRowSelectionChange, onSelectAll],
  );

  const displayColumns = useMemo(() => {
    let cols = [...columns];
    if (visibleColumns !== "all") {
      cols = cols.filter(c => visibleColumns.has(String(c.key)));
    }

    if (selectable) {
      cols.unshift({
        key: "_selection",
        label: "",
        sortable: false,
        priority: "high",
        width: 48,
      });
    }
    if (actions) {
      cols.push({ key: "_actions", label: "Acciones", align: "right" });
    }
    return cols;
  }, [columns, actions, selectable, visibleColumns]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }), []);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeZone: 'America/Bogota',
  }), []);

  const dateTimeFormatter = useMemo(() => new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }), []);

  const renderCell = (col: DataTableColumn<T>, row: T, index: number) => {
    // Selection column
    if (col.key === "_selection") {
      return (
        <HeroCheckbox
          aria-label={`Seleccionar fila ${getKey(row, index)}`}
          slot="selection"
          variant="secondary"
        >
          <HeroCheckbox.Control>
            <HeroCheckbox.Indicator />
          </HeroCheckbox.Control>
        </HeroCheckbox>
      );
    }
    // Actions column
    if (col.key === "_actions" && actions) return actions(row);
    // Custom render function (legacy API)
    if (col.render) return col.render(row);

    const rawValue = row[col.key as keyof T];

    // Delegate to the new Solvy-style cell renderer system
    return (
      <DataTableCellRenderer
        column={col}
        value={rawValue}
        row={row}
      />
    );
  };

  const skeletonRow = (skKey: string) => (
    <Table.Row key={skKey}>
      {displayColumns.map((col) => (
        <Table.Cell key={String(col.key)} className="py-4">
          <div className="h-4 w-full rounded bg-default-100 dark:bg-default-700 animate-pulse" />
        </Table.Cell>
      ))}
    </Table.Row>
  );

  const handleSearchChange = useCallback((query: string) => {
    const searchCallback = searchConfig?.onChange || onSearchChange;
    searchCallback?.(query);
    if (syncWithUrl) {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      params.delete("page"); // reset to page 1
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [syncWithUrl, pathname, router, searchParams, searchConfig?.onChange, onSearchChange]);

  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    onPaginationChange?.(page, pageSize);
    if (syncWithUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [syncWithUrl, pathname, router, searchParams, onPaginationChange]);

  const topContent = useMemo(() => {
    const isSearchEnabled = searchConfig?.enabled ?? searchable ?? false;
    const hasSearch = isSearchEnabled && (searchConfig?.onChange || onSearchChange);
    const hasFilters = filters && filters.length > 0 && onFilterChange;

    if (!hasSearch && !hasFilters && hideColumnsToggle && !exportOptions) return null;

    const finalSearchConfig: SearchConfig = {
      enabled: isSearchEnabled,
      placeholder: searchConfig?.placeholder ?? searchPlaceholder ?? "Buscar...",
      variant: searchConfig?.variant ?? "primary",
      size: searchConfig?.size ?? "sm",
      isClearable: searchConfig?.isClearable ?? true,
      startIcon: searchConfig?.startIcon ?? <Search className="text-default-300 size-4" />,
      className: searchConfig?.className,
    };

    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        {hasSearch && (
          <Input
            variant={finalSearchConfig.variant}
            size={finalSearchConfig.size}
            isClearable={finalSearchConfig.isClearable}
            className={`w-full sm:max-w-md ${finalSearchConfig.className || ""}`}
            placeholder={finalSearchConfig.placeholder}
            aria-label="Buscar en la tabla"
            startContent={finalSearchConfig.startIcon}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        )}
        <div className="flex w-full sm:w-auto items-center gap-3 flex-wrap sm:flex-nowrap">
          {hasFilters &&
            filters.map((filter) => {
              if (filter.type === "select" && filter.options) {
                return (
                  <Autocomplete
                    key={filter.key}
                    className="w-full sm:w-48"
                    placeholder={filter.label}
                    selectionMode="single"
                    onChange={(key: Key | null) => {
                      onFilterChange({ [filter.key]: (key as string) || "" });
                    }}
                  >
                    <Label>{filter.label}</Label>
                    <Autocomplete.Trigger>
                      <Autocomplete.Value />
                      <Autocomplete.ClearButton />
                      <Autocomplete.Indicator />
                    </Autocomplete.Trigger>
                    <Autocomplete.Popover>
                      <Autocomplete.Filter filter={contains}>
                        <SearchField autoFocus name="search" variant="secondary" aria-label={`Buscar ${filter.label}`}>
                          <SearchField.Group>
                            <SearchField.SearchIcon />
                            <SearchField.Input placeholder={`Buscar ${filter.label}...`} />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>
                        <ListBox>
                          {filter.options.map((opt) => (
                            <ListBox.Item
                              key={opt.value}
                              id={opt.value}
                              textValue={opt.label}
                            >
                              {opt.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Autocomplete.Filter>
                    </Autocomplete.Popover>
                  </Autocomplete>
                );
              }
              return null;
            })}
          
          {exportOptions?.csv && (
            <Button
              aria-label="Exportar a CSV"
              onPress={() => exportOptions.onExport?.("csv")}
              variant="ghost"
              isIconOnly
              size="sm"
            >
              <FileText className="size-4" />
            </Button>
          )}
          {exportOptions?.excel && (
            <Button
              aria-label="Exportar a Excel"
              onPress={() => exportOptions.onExport?.("excel")}
              variant="ghost"
              isIconOnly
              size="sm"
            >
              <FileSpreadsheet className="size-4" />
            </Button>
          )}

          {!hideColumnsToggle && (
            <Dropdown>
              <Button
                variant="ghost"
                size="sm"
                data-columns-selection={visibleColumns !== "all" ? "active" : ""}
                className={visibleColumns !== "all" && visibleColumns.size > 0 ? "data-columns-selected" : ""}
              >
                Columnas
                <ChevronDown className="size-4 ml-1" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Columnas de la tabla"
                  selectionMode="multiple"
                  selectedKeys={visibleColumns}
                  onSelectionChange={setVisibleColumns}
                  className="max-h-80 overflow-scroll"
                >
                  {columns.map((col) => (
                    <Dropdown.Item id={String(col.key)} key={String(col.key)} textValue={getDisplayLabel(col)}>
                      <Label>{getDisplayLabel(col)}</Label>
                      <Dropdown.ItemIndicator />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </div>
    );
  }, [
    searchConfig, searchable, searchPlaceholder, handleSearchChange, filters, onFilterChange,
    exportOptions, hideColumnsToggle, columns, visibleColumns
  ]);

  const tableContent = (
    <Table.Content
      aria-label="Data table"
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      selectionMode={selectable ? "multiple" : "none"}
      selectedKeys={selectable ? selection : undefined}
      onSelectionChange={selectable ? handleSelectionChange : undefined}
      className="min-w-full"
    >
      <Table.Header>
        {displayColumns.map((col, idx) => {
          let colDefaultWidth: string | undefined;
          if (col.width) {
            colDefaultWidth = String(col.width);
          } else if (col.resizable) {
            colDefaultWidth = "1fr";
          }

          let columnContent;
          if (col.sortable) {
            columnContent = ({
              sortDirection,
            }: {
              sortDirection?: "ascending" | "descending";
            }) => (
              <SortableHeader sortDirection={sortDirection}>
                {getDisplayLabel(col)}
                {col.resizable && <Table.ColumnResizer />}
              </SortableHeader>
            );
          } else if (col.key === "_selection") {
            columnContent = (
              <HeroCheckbox
                aria-label="Seleccionar todas"
                slot="selection"
                variant="secondary"
              >
                <HeroCheckbox.Control>
                  <HeroCheckbox.Indicator />
                </HeroCheckbox.Control>
              </HeroCheckbox>
            );
          } else {
            columnContent = (
              <span className="flex items-center gap-1">
                {getDisplayLabel(col)}
                {col.resizable && <Table.ColumnResizer />}
              </span>
            );
          }

          return (
            <Table.Column
              key={String(col.key)}
              id={String(col.key)}
              allowsSorting={col.sortable}
              aria-label={col.key === "_selection" ? "Selection" : undefined}
              isRowHeader={
                idx === (selectable ? 1 : 0) &&
                col.key !== "_actions" &&
                col.key !== "_selection"
              }
              // @ts-expect-error HeroUI typing for ColumnSize
              defaultWidth={colDefaultWidth}
              minWidth={col.minWidth}
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.15em]",
                getAlignClass(col.align),
                getPriorityClass(col.priority),
                col.key === "_actions"
                  ? "sticky right-0 z-20 bg-default-100 dark:bg-zinc-800/60 border-l border-default-200 dark:border-zinc-700"
                  : "",
                col.key === "_selection" ? "w-[48px]" : "",
              )}
            >
              {columnContent}
            </Table.Column>
          );
        })}
      </Table.Header>

      {isLoading && source.length === 0 ? (
        <Table.Body>
          {skeletonRow("sk-1")}
          {skeletonRow("sk-2")}
          {skeletonRow("sk-3")}
        </Table.Body>
      ) : shouldVirtualize ? (
        <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: '600px', minHeight: '300px' }}>
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-20">
              <tr>
                {displayColumns.map((col, idx) => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-[0.15em] bg-default-100 dark:bg-zinc-800/60 p-3 text-left",
                      getAlignClass(col.align),
                      getPriorityClass(col.priority),
                      col.key === "_selection" ? "w-[48px]" : "",
                    )}
                    style={col.width ? { width: typeof col.width === 'number' ? col.width : col.width } : undefined}
                  >
                    {col.key === "_selection" ? (
                      <HeroCheckbox
                        aria-label="Seleccionar todas"
                        slot="selection"
                        variant="secondary"
                      >
                        <HeroCheckbox.Control>
                          <HeroCheckbox.Indicator />
                        </HeroCheckbox.Control>
                      </HeroCheckbox>
                    ) : getDisplayLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ position: 'relative', height: `${rowVirtualizer.getTotalSize()}px` }}>
              {sortedSource.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length} className="text-center py-16 text-default-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = sortedSource[virtualRow.index];
                  return (
                    <tr
                      key={getKey(row, virtualRow.index)}
                      className="border-b border-default-100 dark:border-zinc-800"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {displayColumns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={cn(
                            "p-3 text-sm",
                            getAlignClass(col.align),
                            getPriorityClass(col.priority),
                            col.key === "_actions"
                              ? "sticky right-0 z-10 border-l border-default-200 dark:border-zinc-700 bg-default-50 dark:bg-default-100 dark:bg-zinc-900"
                              : "",
                          )}
                        >
                          {renderCell(col, row, virtualRow.index)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <Table.Body
          renderEmptyState={() => (
            <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center py-16">
              <div className="mb-2 rounded-full border border-default-100 dark:border-default-700 bg-default-50 dark:bg-default-800 p-4">
                <Inbox className="size-8 text-default-300 dark:text-default-600" />
              </div>
              <span className="text-base font-medium text-default-500 dark:text-default-400">
                {emptyMessage}
              </span>
            </EmptyState>
          )}
        >
          {sortedSource.map((row, index) => (
            <Table.Row
              key={getKey(row, index)}
              id={getKey(row, index)}
            >
              {displayColumns.map((col) => (
                <Table.Cell
                  key={String(col.key)}
                  className={cn(
                    getAlignClass(col.align),
                    getPriorityClass(col.priority),
                    col.key === "_actions"
                      ? "sticky right-0 z-10 border-l border-default-200 dark:border-zinc-700"
                      : "",
                  )}
                >
                  {renderCell(col, row, index)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      )}
    </Table.Content>
  );

  return (
    <div className="flex flex-col gap-4">
      {topContent}
      {shouldVirtualize ? (
        <div className="border border-default-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          {tableContent}
        </div>
      ) : (
        <Table variant="primary">
          <Table.ScrollContainer>
            {resizable ? (
              <Table.ResizableContainer>{tableContent}</Table.ResizableContainer>
            ) : (
              tableContent
            )}
          </Table.ScrollContainer>

          {paginationConfig && onPaginationChange && (
            <Table.Footer>
              <TableFooterContent
                config={paginationConfig}
                onChange={handlePaginationChange}
                selectionCount={
                  selectable ? (controlledSelectedKeys?.size ?? 0) : undefined
                }
                totalItems={source.length}
              />
            </Table.Footer>
          )}
        </Table>
      )}
      {shouldVirtualize && paginationConfig && onPaginationChange && (
        <Table.Footer>
          <TableFooterContent
            config={paginationConfig}
            onChange={handlePaginationChange}
            selectionCount={
              selectable ? (controlledSelectedKeys?.size ?? 0) : undefined
            }
            totalItems={source.length}
          />
        </Table.Footer>
      )}
    </div>
  );
}

function TableFooterContent({
  config,
  onChange,
  selectionCount,
  totalItems,
}: {
  config: NonNullable<DataTableProps<unknown>["pagination"]>;
  onChange: NonNullable<DataTableProps<unknown>["onPaginationChange"]>;
  selectionCount?: number;
  totalItems: number;
}) {
  const totalPages = Math.ceil(config.total / config.pageSize);
  const start = (config.page - 1) * config.pageSize + 1;
  const end = Math.min(config.page * config.pageSize, config.total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex w-full items-center justify-between">
      {selectionCount !== undefined && selectionCount > 0 ? (
        <div className="text-sm text-blue-600 font-medium">
          {selectionCount === totalItems
            ? "Todos los registros seleccionados"
            : `${selectionCount} de ${totalItems} registros seleccionados`}
        </div>
      ) : (
        <div />
      )}

      <Pagination size="sm">
        <Pagination.Summary>
          {start} a {end} de {config.total} resultados
        </Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous
              isDisabled={config.page === 1}
              onPress={() => onChange(config.page - 1, config.pageSize)}
            >
              <Pagination.PreviousIcon />
              Anterior
            </Pagination.Previous>
          </Pagination.Item>
          {pages.map((p) => (
            <Pagination.Item key={p}>
              <Pagination.Link
                isActive={p === config.page}
                onPress={() => onChange(p, config.pageSize)}
              >
                {p}
              </Pagination.Link>
            </Pagination.Item>
          ))}
          <Pagination.Item>
            <Pagination.Next
              isDisabled={config.page === totalPages}
              onPress={() => onChange(config.page + 1, config.pageSize)}
            >
              Siguiente
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </div>
  );
}

const DataTable = memo(DataTableInner) as unknown as typeof DataTableInner;
export default DataTable;
