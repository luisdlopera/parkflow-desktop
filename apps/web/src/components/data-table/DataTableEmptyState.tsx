'use client';

import { Database, Filter, Search } from 'lucide-react';

interface DataTableEmptyStateProps {
  hasFilters: boolean;
  filterCount: number;
}

export function DataTableEmptyState({
  hasFilters,
  filterCount,
}: DataTableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-default-100">
        {hasFilters ? (
          <Filter size={32} className="text-default-300" />
        ) : (
          <Database size={32} className="text-default-300" />
        )}
      </div>

      <div className="text-center">
        <h3 className="text-sm font-semibold text-default-700">
          {hasFilters ? 'No se encontraron resultados' : 'Sin registros'}
        </h3>
        <p className="text-xs text-default-500 mt-1">
          {hasFilters
            ? `Prueba a cambiar los filtros (${filterCount} filtro${filterCount !== 1 ? 's' : ''} activo${filterCount !== 1 ? 's' : ''})`
            : 'Comienza creando tu primer registro'}
        </p>
      </div>
    </div>
  );
}
