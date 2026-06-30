import React from "react";
import { Chip } from "@heroui/react";
import { CellRendererProps, BadgeOptions } from "../types";

/**
 * BadgeCell / StatusCell — Renderiza Chips con mapeo de colores y etiquetas.
 * Soporta opciones: colorMap, labelMap, variantMap.
 */
const BadgeCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as BadgeOptions;
  const { colorMap, labelMap, variantMap } = opts;

  if (value === null || value === undefined || value === "") {
    return <span className="text-default-400 select-none">−</span>;
  }

  const strValue = String(value);

  // Default color map for ParkFlow statuses
  const defaultStatusColors: Record<string, string> = {
    ACTIVE: "success",
    INACTIVE: "danger",
    PENDING: "warning",
    COMPLETED: "success",
    CANCELLED: "danger",
    ARCHIVED: "default",
  };

  const defaultStatusLabels: Record<string, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    PENDING: "Pendiente",
    COMPLETED: "Completado",
    CANCELLED: "Cancelado",
    ARCHIVED: "Archivado",
  };

  const label = labelMap?.[strValue] ?? defaultStatusLabels[strValue] ?? strValue;
  const color = (colorMap?.[strValue] ?? defaultStatusColors[strValue] ?? "default") as any;
  const variant = (variantMap?.[strValue] ?? "soft") as any;

  return (
    <Chip color={color} size="sm" variant={variant}>
      {label}
    </Chip>
  );
};

export default BadgeCell;
