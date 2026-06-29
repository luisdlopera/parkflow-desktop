"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/bridge/Input";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { ListBox } from "@heroui/react";
import { Search, X } from "lucide-react";

interface SearchAndFiltersToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterValues: Record<string, string>;
  onFilterChange: (values: Record<string, string>) => void;
  onClearFilters: () => void;
  vehicleTypeOptions: Array<{ label: string; value: string }>;
  hasActiveFilters: boolean;
}

export function SearchAndFiltersToolbar({
  searchValue,
  onSearchChange,
  filterValues,
  onFilterChange,
  onClearFilters,
  vehicleTypeOptions,
  hasActiveFilters,
}: SearchAndFiltersToolbarProps) {
  const handleVehicleTypeChange = (keys: Set<React.Key>) => {
    const selectedKey = Array.from(keys)[0];
    if (selectedKey) {
      onFilterChange({ vehicleType: String(selectedKey) });
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap lg:flex-nowrap">
      {/* Search Input */}
      <div className="flex-1 min-w-[250px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por placa, ticket o propietario..."
            className="pl-10"
            size="sm"
            isClearable
            onClear={() => onSearchChange("")}
          />
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Vehicle Type Filter */}
        <Select
          aria-label="Filtrar por tipo de vehículo"
          value={[filterValues.vehicleType || "all"]}
          onChange={handleVehicleTypeChange}
          className="w-40"
          classNames={{ trigger: "min-h-0 h-8 text-sm" }}
        >
          <Select.Trigger aria-label="Tipo de vehículo">
            <Select.Value aria-label="Tipo de vehículo" />
            <Select.Indicator aria-label="Tipo de vehículo" />
          </Select.Trigger>
          <Select.Popover aria-label="Tipo de vehículo">
            <ListBox>
              <ListBox.Item key="all" textValue="Todos">
                Todos
              </ListBox.Item>
              {vehicleTypeOptions.map((option) => (
                <ListBox.Item key={option.value} textValue={option.label}>
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-default-500 hover:text-foreground"
            onPress={onClearFilters}
            aria-label="Limpiar filtros"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
