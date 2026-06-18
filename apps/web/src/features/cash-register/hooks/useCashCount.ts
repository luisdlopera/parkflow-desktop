"use client";
import { useMemo } from "react";

export interface DenominationRow {
  denomination: number;
  quantity: string;
}

const COP_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

export function useCashCount(rows: DenominationRow[]) {
  const total = useMemo(
    () =>
      rows.reduce((sum, row) => sum + row.denomination * (Number(row.quantity) || 0), 0),
    [rows],
  );

  const defaultRows = (): DenominationRow[] =>
    COP_DENOMINATIONS.map((d) => ({ denomination: d, quantity: "" }));

  function difference(expected: number): number {
    return total - expected;
  }

  function differenceLabel(expected: number): string {
    const diff = difference(expected);
    if (diff === 0) return "Cuadre exacto";
    if (diff > 0) return `Sobrante: $${diff.toLocaleString("es-CO")}`;
    return `Faltante: $${Math.abs(diff).toLocaleString("es-CO")}`;
  }

  return {
    total,
    difference,
    differenceLabel,
    defaultRows,
    COP_DENOMINATIONS,
  };
}
