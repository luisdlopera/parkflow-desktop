import React from "react";
import { Chip } from "@heroui/react";
import { CellRendererProps, BadgeOptions } from "../types";

/**
 * StatusCell — Renderiza un estado con Chip y colores semánticos por defecto.
 * Soporta opciones: colorMap, labelMap, variantMap.
 * Este componente está separado de BadgeCell para permitir diferentes defaults.
 */
const StatusCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as BadgeOptions;
  const { colorMap, labelMap, variantMap } = opts;

  if (value === null || value === undefined || value === "") {
    return <span className="text-default-400 select-none">−</span>;
  }

  const strValue = String(value);

  // Default status colors for ParkFlow
  const defaultStatusColors: Record<string, string> = {
    ACTIVE: "success",
    INACTIVE: "danger",
    PENDING: "warning",
    COMPLETED: "success",
    CANCELLED: "danger",
    ARCHIVED: "default",
    PAID: "success",
    UNPAID: "danger",
    OVERDUE: "warning",
  };

  const defaultStatusLabels: Record<string, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    PENDING: "Pendiente",
    COMPLETED: "Completado",
    CANCELLED: "Cancelado",
    ARCHIVED: "Archivado",
    PAID: "Pagado",
    UNPAID: "No pagado",
    OVERDUE: "Vencido",
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

export default StatusCell;
