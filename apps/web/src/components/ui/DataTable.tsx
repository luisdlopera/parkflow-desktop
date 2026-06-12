"use client";

import { useMemo, useState } from "react";
import { Pagination, Table, cn, type SortDescriptor } from "@heroui/react";
import { ChevronUp, Inbox } from "lucide-react";

export type DataTableColumn<T> = {
  key: keyof T | string;
  label?: string;
  header?: string;
  priority?: "high" | "medium" | "low";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
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
  onChange?: (keys: Set<string>) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: number[];
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
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

export default function DataTable<T extends object>({
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
}: DataTableProps<T>) {
  const source = useMemo(() => data ?? rows ?? [], [data, rows]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();

  const displayColumns = useMemo(() => {
    if (!actions) return columns;
    return [
      ...columns,
      { key: "_actions" as const, label: "Acciones", align: "right" as const },
    ];
  }, [columns, actions]);

  const sortedSource = useMemo(() => {
    if (!sortDescriptor?.column || !sortDescriptor?.direction) return source;
    return [...source].sort((a, b) => {
      const key = sortDescriptor.column as keyof T;
      const aVal = String(a[key] ?? "");
      const bVal = String(b[key] ?? "");
      let cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      if (sortDescriptor.direction === "descending") cmp *= -1;
      return cmp;
    });
  }, [source, sortDescriptor]);

  const getKey = (row: T, index: number) =>
    getRowKey ? getRowKey(row) : String(rowKey(row, index));

  const renderCell = (col: DataTableColumn<T>, row: T) => {
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

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Data table"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <Table.Header>
            {displayColumns.map((col, idx) => (
              <Table.Column
                key={String(col.key)}
                id={String(col.key)}
                allowsSorting={col.sortable}
                isRowHeader={idx === 0 && col.key !== "_actions"}
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.15em]",
                  getAlignClass(col.align),
                  getPriorityClass(col.priority),
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
                      </SortableHeader>
                    )
                  : getDisplayLabel(col)}
              </Table.Column>
            ))}
          </Table.Header>

          {isLoading && source.length === 0 ? (
            <Table.Body>
              {skeletonRow("sk-1")}
              {skeletonRow("sk-2")}
              {skeletonRow("sk-3")}
            </Table.Body>
          ) : (
            <Table.Body
              renderEmptyState={() => (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-4 rounded-full border border-slate-100 bg-slate-50 p-4">
                    <Inbox className="size-8 text-slate-300" />
                  </div>
                  <p className="text-base font-medium text-slate-500">
                    {emptyMessage}
                  </p>
                </div>
              )}
            >
              {sortedSource.map((row, index) => (
                <Table.Row key={getKey(row, index)}>
                  {displayColumns.map((col) => (
                    <Table.Cell
                      key={String(col.key)}
                      className={cn(
                        getAlignClass(col.align),
                        getPriorityClass(col.priority),
                      )}
                    >
                      {renderCell(col, row)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          )}
        </Table.Content>
      </Table.ScrollContainer>

      {paginationConfig && onPaginationChange && (
        <TableFooterContent
          config={paginationConfig}
          onChange={onPaginationChange}
        />
      )}
    </Table>
  );
}

function TableFooterContent({
  config,
  onChange,
}: {
  config: NonNullable<DataTableProps<unknown>["pagination"]>;
  onChange: NonNullable<DataTableProps<unknown>["onPaginationChange"]>;
}) {
  const totalPages = Math.ceil(config.total / config.pageSize);
  const start = (config.page - 1) * config.pageSize + 1;
  const end = Math.min(config.page * config.pageSize, config.total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <Table.Footer>
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
    </Table.Footer>
  );
}
