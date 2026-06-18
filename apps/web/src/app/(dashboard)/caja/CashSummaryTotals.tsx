"use client";

import { memo } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import Badge from "@/components/ui/Badge";
import type { CashSummaryDto } from "@/lib/cash/cash-api";

function getDifferenceCardClass(
  countedTotal: number | null | undefined,
  difference: number | null | undefined,
): string {
  if (countedTotal == null) return "bg-slate-50 border-slate-200 border-dashed";
  if (difference === 0) return "bg-emerald-50 border-emerald-100";
  return "bg-amber-50 border-amber-100";
}

function getPaymentMethodTone(method: string): string {
  if (method === "CASH") return "success";
  if (method === "TRANSFER") return "warning";
  return "neutral";
}

/**
 * Totals summary for an open/closed cash session: the four KPI cards plus the
 * per-payment-method and per-movement-type breakdowns. Depends only on
 * `summary`, so React.memo keeps it from re-rendering on unrelated keystrokes.
 */
function CashSummaryTotalsInner({ summary }: { summary: CashSummaryDto }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Base inicial
            <Tooltip content="Monto en efectivo con el que se abrió la caja">
              <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
            </Tooltip>
          </div>
          <p className="text-lg font-semibold text-slate-900">${summary.openingAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Esperado (Libro)
            <Tooltip content="Total que debería haber según los movimientos registrados">
              <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
            </Tooltip>
          </div>
          <p className="text-lg font-semibold text-slate-900">${summary.expectedLedgerTotal.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-3 border ${summary.countedTotal != null ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200 border-dashed"}`}>
          <div className={`text-[10px] uppercase tracking-wider ${summary.countedTotal != null ? "text-blue-600" : "text-slate-400"}`}>
            Contado
            <Tooltip content="Efectivo físico contado al realizar el arqueo">
              <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
            </Tooltip>
          </div>
          {summary.countedTotal != null ? (
            <p className="text-lg font-semibold text-blue-900">${summary.countedTotal.toLocaleString()}</p>
          ) : (
            <p className="text-lg font-semibold text-slate-400 italic">Pendiente</p>
          )}
        </div>
        <div className={`rounded-xl p-3 border ${getDifferenceCardClass(summary.countedTotal, summary.difference)}`}>
          <div className={`text-[10px] uppercase tracking-wider ${summary.countedTotal != null ? "text-slate-500" : "text-slate-400"}`}>
            Diferencia
            <Tooltip content={summary.countedTotal != null ? `Contado − Esperado = ${summary.countedTotal.toLocaleString()} − ${summary.expectedLedgerTotal.toLocaleString()}` : "Realiza el arqueo para ver la diferencia"}>
              <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
            </Tooltip>
          </div>
          {summary.countedTotal != null ? (
            <p className={`text-lg font-semibold ${summary.difference === 0 ? "text-emerald-700" : "text-amber-700"}`}>
              ${(summary.difference ?? 0).toLocaleString()}
            </p>
          ) : (
            <p className="text-lg font-semibold text-slate-400 italic">Pendiente</p>
          )}
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <p className="font-semibold text-slate-800 text-xs uppercase tracking-tight">Ventas por medio de pago</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.totalsByPaymentMethod).map(([method, amount]) => (
            <Badge
              key={method}
              label={`${method}: $${amount.toLocaleString()}`}
              tone={getPaymentMethodTone(method)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <p className="font-semibold text-slate-800 text-xs uppercase tracking-tight">Resumen por tipo</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.totalsByMovementType).map(([type, amount]) => (
            <Badge
              key={type}
              label={`${type.replace(/_/g, " ")}: $${amount.toLocaleString()}`}
              tone={amount < 0 ? "warning" : "neutral"}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export const CashSummaryTotals = memo(CashSummaryTotalsInner);
