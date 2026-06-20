"use client";

import { useMemo, useState, useCallback, useRef, memo } from "react";
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
  type SortDescriptor,
  type Selection,
  type Key,
} from "@heroui/react";
import { Input } from "@/components/bridge/Input";
import { Autocomplete } from "@/components/bridge/Autocomplete";
import { ChevronUp, Inbox, Search } from "lucide-react";

export type DataTableColumn<T> = {
  key: keyof T | (string & {});
  label?: string;
  header?: string;
  priority?: "high" | "medium" | "low";
  sortable?: boolean;
  sortType?: "string" | "number" | "date" | "boolean";
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
  searchable?: boolean;
  searchPlaceholder?: string;
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
}: DataTableProps<T>) {
  const { contains } = useFilter({ sensitivity: "base" });
  const source = useMemo(() => data ?? rows ?? [], [data, rows]);
  const [internalSortDescriptor, setInternalSortDescriptor] = useState<SortDescriptor>();
  
  const sortDescriptor = controlledSortDescriptor ?? internalSortDescriptor;
  const setSortDescriptor = controlledOnSortChange ?? setInternalSortDescriptor;

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
    const cols = [...columns];
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
  }, [columns, actions, selectable]);

  const renderCell = (col: DataTableColumn<T>, row: T, index: number) => {
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
    if (col.key === "_actions" && actions) return actions(row);
    if (col.render) return col.render(row);
    return String(row[col.key as keyof T] ?? "");
  };

  const skeletonRow = (skKey: string) => (
    <Table.Row key={skKey}>
      {displayColumns.map((col) => (
        <Table.Cell key={String(col.key)} className="py-4">
          <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
        </Table.Cell>
      ))}
    </Table.Row>
  );

  const topContent = useMemo(() => {
    const hasSearch = searchable && onSearchChange;
    const hasFilters = filters && filters.length > 0 && onFilterChange;
    if (!hasSearch && !hasFilters) return null;

    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        {hasSearch && (
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder={searchPlaceholder}
            aria-label="Buscar en la tabla"
            startContent={<Search className="text-default-300 size-4" />}
            onChange={(e) => onSearchChange(e.target.value)}
            size="sm"
          />
        )}
        <div className="flex w-full sm:w-auto items-center gap-3">
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
        </div>
      </div>
    );
  }, [searchable, searchPlaceholder, onSearchChange, filters, onFilterChange]);

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
        {displayColumns.map((col, idx) => (
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
            defaultWidth={col.width ? String(col.width) : col.resizable ? "1fr" : undefined as any}
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
            {col.sortable
              ? ({
                  sortDirection,
                }: {
                  sortDirection?: "ascending" | "descending";
                }) => (
                  <SortableHeader sortDirection={sortDirection}>
                    {getDisplayLabel(col)}
                    {col.resizable && <Table.ColumnResizer />}
                  </SortableHeader>
                )
              : col.key === "_selection"
                ? (
                  <HeroCheckbox
                    aria-label="Seleccionar todas"
                    slot="selection"
                    variant="secondary"
                  >
                    <HeroCheckbox.Control>
                      <HeroCheckbox.Indicator />
                    </HeroCheckbox.Control>
                  </HeroCheckbox>
                )
                : (
                  <span className="flex items-center gap-1">
                    {getDisplayLabel(col)}
                    {col.resizable && <Table.ColumnResizer />}
                  </span>
                )}
          </Table.Column>
        ))}
      </Table.Header>

      {isLoading && source.length === 0 ? (
        <Table.Body>
          {skeletonRow("sk-1")}
          {skeletonRow("sk-2")}
          {skeletonRow("sk-3")}
        </Table.Body>
      ) : shouldVirtualize ? (
        <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: '600px' }}>
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
                  <td colSpan={displayColumns.length} className="text-center py-16 text-slate-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = sortedSource[virtualRow.index];
                  return (
                    <tr
                      key={getKey(row, virtualRow.index)}
                      className="border-b border-slate-100 dark:border-zinc-800"
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
                              ? "sticky right-0 z-10 border-l border-default-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
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
              <div className="mb-2 rounded-full border border-slate-100 bg-slate-50 p-4">
                <Inbox className="size-8 text-slate-300" />
              </div>
              <span className="text-base font-medium text-slate-500">
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
        <div className="border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden">
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
                onChange={onPaginationChange}
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
            onChange={onPaginationChange}
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
