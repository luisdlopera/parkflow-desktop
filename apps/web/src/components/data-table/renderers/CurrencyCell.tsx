import React, { useMemo } from "react";
import { Chip } from "@heroui/react";
import { CellRendererProps, CurrencyOptions } from "../types";

/**
 * Formatea números con el estilo de moneda de ParkFlow.
 * Por defecto: COP, es-CO, sin decimales.
 */
const CurrencyCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const {
    currency = "COP",
    locale = "es-CO",
    showSymbol = true,
  } = (column.options as CurrencyOptions) ?? {};

  const formatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, [locale, currency]);

  if (value === null || value === undefined || value === "") {
    return <span className="text-default-400 select-none">−</span>;
  }


  const num = Number(value);
  if (Number.isNaN(num)) {
    return <span className="text-danger-500">Invalid</span>;
  }

  return (
    <span className="text-primary font-medium tabular-nums">
      {showSymbol ? formatter.format(num) : num.toLocaleString(locale)}
    </span>
  );
};

export default CurrencyCell;
