import React from "react";
import { CellRendererProps, RelationOptions } from "../types";

/**
 * RelationCell — Renderiza un campo de una relación (ej. nombre de un usuario).
 * Opciones: labelKey (default "name"), valueKey (default "id").
 */
const RelationCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const emptyText = column.options?.emptyText ?? "−";
  const { labelKey = "name" } = (column.options as RelationOptions) ?? {};

  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  // Si es un string plano, úsalo directamente
  if (typeof value === "string") {
    return <span className="text-foreground">{value}</span>;
  }

  // Si es un objeto, extraer la clave del label
  const label = (value as any)?.[labelKey] ?? emptyText;

  return <span className="text-foreground">{label}</span>;
};

export default RelationCell;
