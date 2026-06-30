import React from "react";
import { CellRendererProps, FormatEnumOptions } from "../types";

/**
 * FormatEnumCell — Mapea valores de enum a etiquetas legibles.
 * Opciones: labelMap, fallbackLabel.
 */
const FormatEnumCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as FormatEnumOptions;
  const { labelMap, fallbackLabel } = opts;

  if (value === null || value === undefined || value === "") {
    return <span className="text-default-400 select-none">−</span>;
  }

  const strValue = String(value);

  // Default mappings for common vehicle types
  const defaultLabelMap: Record<string, string> = {
    CAR: "Carro",
    MOTORCYCLE: "Moto",
    BIKE: "Bicicleta",
    MIXED: "Mixto",
    TRUCK: "Camión",
    BUS: "Bus",
    OTHER: "Otro",
  };

  const label = labelMap?.[strValue] ?? defaultLabelMap[strValue] ?? fallbackLabel ?? strValue;

  return <span className="text-foreground">{label}</span>;
};

export default FormatEnumCell;
