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
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex justify-between items-center w-full">
        <div className="flex flex-1 items-center gap-2 max-w-sm">
          <Input
            placeholder="Buscar en todos los campos..."
            value={globalFilter ?? ''}
            onValueChange={onGlobalFilterChange}
            startContent={<Search className="text-default-300" size={16} />}
            endContent={
              globalFilter ? (
                <button
                  onClick={() => onGlobalFilterChange('')}
                  className="focus:outline-none"
                  aria-label="Clear search"
                >
                  <X className="text-default-300" size={16} />
                </button>
              ) : null
            }
            size="sm"
            variant="faded"
            classNames={{
              inputWrapper: "h-10",
            }}
          />
        </div>
        
        <div className="flex items-center gap-2">
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
    </div>
  );
}
