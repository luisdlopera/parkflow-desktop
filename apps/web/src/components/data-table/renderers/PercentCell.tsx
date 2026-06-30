import React from "react";
import { CellRendererProps } from "../types";

/**
 * PercentCell — Renderiza valores porcentuales formateados.
 * value puede venir como 0.15, 15, o 0.15 como porcentaje.
 * Por defecto asume que el valor ya está en porcentaje (ej. 15 = 15%).
 */
const PercentCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const emptyText = column.options?.emptyText ?? "−";

  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  const locale = (column.options as any)?.locale ?? "es-CO";
  const decimals = (column.options as any)?.decimals ?? 1;
  const showSymbol = (column.options as any)?.showSymbol !== false;

  const num = Number(value);
  const formatter = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className="text-foreground tabular-nums">
      {formatter.format(num)}
      {showSymbol ? "" : ""} {/* Already formatted as percent by Intl */}
    </span>
  );
};

export default PercentCell;
