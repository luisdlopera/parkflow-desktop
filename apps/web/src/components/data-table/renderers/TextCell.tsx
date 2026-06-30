import React from "react";
import { CellRendererProps } from "../types";

/**
 * TextCell — Renderer dedicado para texto plano.
 * Maneja null/undefined y valores vacíos.
 */
const TextCell: React.FC<CellRendererProps> = ({ column, value }) => {
  const emptyText = column.options?.emptyText ?? "−";

  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  return <span className="text-foreground">{String(value)}</span>;
};

export default TextCell;
