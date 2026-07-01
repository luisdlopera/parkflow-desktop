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
    <div data-testid="active-vehicles-filters">
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

        <Popover.Content className="max-w-[360px]">
          <Popover.Dialog>
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              {/* Filter Options */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-default-600 uppercase tracking-wider block">
                  Tipo de vehículo
                </label>
                <Select
                  value={filterValues.vehicleType || "all"}
                  onChange={handleVehicleTypeChange}
                  placeholder="Selecciona tipo..."
                  size="sm"
                  className="w-full"
                  classNames={{
                    trigger: "bg-default-50 dark:bg-default-900/50 border border-default-200 dark:border-default-700 hover:border-brand-300 dark:hover:border-brand-700/50"
                  }}
                >
                  {vehicleTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Active Filter Display */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                  <span className="text-xs text-brand-700 dark:text-brand-300">
                    <span className="font-medium">
                      {vehicleTypeOptions.find((opt) => opt.value === filterValues.vehicleType)
                        ?.label || "Todos"}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
