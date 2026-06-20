import { ColumnDef as TanStackColumnDef, SortingState } from "@tanstack/react-table";

/**
 * Extended ColumnDef with additional metadata
 * Usage: Spread this into your TanStackColumnDef
 * Example: { id: 'name', header: 'Name', cell: row => row.getValue('name'), priority: 'high' }
 */
export interface ColumnMeta {
  priority?: 'high' | 'medium' | 'low';
}

// 1. Pagination and Fetching
export interface PaginationState {
  pageIndex: number; // 0-indexed para TanStack, 1-indexed para UI
  pageSize: number;
}

export interface FetchDataParams {
  pagination: PaginationState;
  sorting: SortingState;
  filters: FilterState[];
  globalFilter?: string;
}

export interface FetchDataResult<T> {
  data: T[];
  pageCount: number;
  rowCount: number;
}

// 2. Filters
export type FilterType = 'text' | 'number' | 'date' | 'dateRange' | 'select' | 'multiSelect' | 'boolean';

export interface FilterDefinition {
  id: string;
  label: string;
  type: FilterType;
  options?: { label: string; value: string | number | boolean }[]; // Para selects
}

export interface FilterState {
  id: string;
  value: unknown;
}

// 3. Bulk Actions
export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  onClick: (selectedRows: T[], isAllSelected: boolean) => void | Promise<void>;
  requiresConfirmation?: boolean;
}

// 4. Export Configuration
export interface ExportConfig {
  onExport: (format: 'csv' | 'excel' | 'pdf') => Promise<void>;
  supportedFormats?: ('csv' | 'excel' | 'pdf')[];
}

// 5. Main Props
export interface DataTableProps<TData, TValue> {
  columns: TanStackColumnDef<TData, TValue>[];
  fetchData: (params: FetchDataParams) => Promise<FetchDataResult<TData>>;
  filterDefinitions?: FilterDefinition[];
  bulkActions?: BulkAction<TData>[];
  rowActions?: (row: TData) => React.ReactNode;
  tableName: string; // Para persistencia en LocalStorage
  enableVirtualization?: boolean;
  exportConfig?: ExportConfig;
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  emptyStateContent?: React.ReactNode;
}
