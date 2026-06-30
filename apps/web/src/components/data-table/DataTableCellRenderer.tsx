import React from "react";
import { mapFormatToType } from "./cellRegistry";
import { CellRendererProps } from "./types";
import { getCellRenderer } from "./cellRegistry";

/**
 * DataTableCellRenderer — Renderer centralizado de celdas.
 *
 * Este componente delega el renderizado al renderer apropiado
 * según el `type` de la columna. Si la columna usa el campo
 * legacy `format`, lo mapea automáticamente a `type`.
 *
 * Si el valor es nulo o vacío, el renderer interno maneja
 * el fallback (por defecto muestra "−").
 */
export const DataTableCellRenderer = <T extends object>({
  column,
  value,
  row,
}: CellRendererProps<T>) => {
  // Compatibilidad con columnas heredadas que usan `format`
  const effectiveType = column.type || (column.format ? mapFormatToType(column.format) : "text");

  const Renderer = getCellRenderer(effectiveType);

  return <Renderer column={column as any} value={value} row={row as any} />;
};
