import React from "react";
import { CellRendererProps } from "../types";

/**
 * FallbackCell — Maneja valores nulos, undefined, vacíos, y tipos inesperados.
 * Es el renderer por defecto si no hay uno registrado para el tipo.
 */
const FallbackCell: React.FC<CellRendererProps> = ({ column, value }) => {
  const emptyText = column.options?.emptyText ?? "−";

  // 1. Null / undefined
  if (value === null || value === undefined) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  // 2. String vacío
  if (typeof value === "string" && value.trim() === "") {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  // 3. Array vacío
  if (Array.isArray(value) && value.length === 0) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  // 4. Object vacío {}
  if (typeof value === "object" && value !== null && Object.keys(value).length === 0) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  // 5. NaN / number inválido
  if (typeof value === "number" && Number.isNaN(value)) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  // Fallback final: renderizar como texto plano
  return <span className="text-foreground">{String(value)}</span>;
};

export default FallbackCell;
