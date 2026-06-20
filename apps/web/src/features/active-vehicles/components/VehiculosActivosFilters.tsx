"use client";

import { useMemo } from "react";
import { Button, Popover, Badge } from "@heroui/react";
import { Select } from "@/components/bridge/Select";
import { Filter } from "lucide-react";

interface VehiculosActivosFiltersProps {
  filterValues: Record<string, string>;
  onFilterChange: (values: Record<string, string>) => void;
  vehicleTypeOptions: Array<{ label: string; value: string }>;
  isLoading?: boolean;
}

export function VehiculosActivosFilters({
  filterValues,
  onFilterChange,
  vehicleTypeOptions,
  isLoading = false,
}: VehiculosActivosFiltersProps) {
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterValues.vehicleType && filterValues.vehicleType !== "all") count++;
    return count;
  }, [filterValues]);

  const handleVehicleTypeChange = (keys: Set<React.Key>) => {
    const selectedKey = Array.from(keys)[0];
    if (selectedKey) {
      onFilterChange({ vehicleType: String(selectedKey) });
    }
  };

  const handleClearFilters = () => {
    onFilterChange({ vehicleType: "all" });
  };

  return (
    <Popover>
      <Popover.Trigger>
        <Button
          size="sm"
          variant="secondary"
          className="relative"
          isDisabled={isLoading}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge
              content={String(activeFilterCount)}
              color="danger"
              size="sm"
              className="absolute top-0 right-0"
            >
              <span />
            </Badge>
          )}
        </Button>
      </Popover.Trigger>

      <Popover.Content className="max-w-[340px]">
        <Popover.Dialog>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Filtros</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="border-t border-default-200" />

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 block">
                Tipo de vehículo
              </label>
              <Select
                value={filterValues.vehicleType || "all"}
                onChange={handleVehicleTypeChange}
                placeholder="Selecciona tipo..."
                size="sm"
                className="w-full"
              >
                {vehicleTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                Mostrando: <span className="font-medium text-slate-700">
                  {vehicleTypeOptions.find((opt) => opt.value === filterValues.vehicleType)
                    ?.label || "Todos"}
                </span>
              </div>
            )}

            <div className="border-t border-default-200" />

            <Button
              className="w-full"
              variant="primary"
              size="sm"
            >
              Aplicar filtros
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
