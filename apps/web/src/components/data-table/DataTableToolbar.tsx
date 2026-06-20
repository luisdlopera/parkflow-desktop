import { Table } from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import { DataTableColumns } from './DataTableColumns';
import { DataTableExport } from './DataTableExport';
import { FilterDefinition, ExportConfig } from './types';
import { Input } from '@/components/bridge/Input';
import { Button } from '@/components/bridge/Button';
import { DataTableFilters } from './DataTableFilters';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  filterDefinitions?: FilterDefinition[];
  exportConfig?: ExportConfig;
  filters: any[];
  onFiltersChange: (filters: any[]) => void;
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  onGlobalFilterChange,
  filterDefinitions,
  exportConfig,
  filters,
  onFiltersChange,
}: DataTableToolbarProps<TData>) {
  const hasActiveFilters = globalFilter || (filters && filters.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Search Row - Always visible */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Buscar..."
            value={globalFilter ?? ''}
            onValueChange={onGlobalFilterChange}
            startContent={<Search className="text-default-300 flex-shrink-0" size={16} />}
            endContent={
              globalFilter ? (
                <button
                  onClick={() => onGlobalFilterChange('')}
                  className="focus:outline-none hover:text-default-500 transition-colors flex-shrink-0"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                >
                  <X className="text-default-400" size={16} />
                </button>
              ) : null
            }
            size="sm"
            variant="bordered"
            classNames={{
              inputWrapper: "h-10 border-default-200",
            }}
            isClearable={!!globalFilter}
          />
        </div>

        {/* Filter and Tools Row */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {filterDefinitions && filterDefinitions.length > 0 && (
            <DataTableFilters
              definitions={filterDefinitions}
              filters={filters}
              onChange={onFiltersChange}
            />
          )}
          <DataTableColumns table={table} />
          {exportConfig && <DataTableExport config={exportConfig} />}
        </div>
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-xs text-default-500">
          <div className="flex items-center gap-1">
            {globalFilter && (
              <span className="px-2 py-1 bg-default-100 rounded-full text-default-700 font-medium">
                Búsqueda: "{globalFilter}"
              </span>
            )}
            {filters && filters.length > 0 && (
              <span className="px-2 py-1 bg-default-100 rounded-full text-default-700 font-medium">
                {filters.length} filtro{filters.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              onGlobalFilterChange('');
              onFiltersChange([]);
            }}
            className="text-primary hover:underline transition-colors"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
}
