"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input } from "@heroui/react";
import { Calculator, ChevronDown, ChevronUp, RotateCcw, Banknote } from "lucide-react";

interface ChangeCalculatorProps {
  totalAmount: number;
  onClose?: () => void;
}

const DENOMINATIONS = [
  { value: 100000, label: "$100k", fullLabel: "$100.000", type: "bill" as const },
  { value: 50000, label: "$50k", fullLabel: "$50.000", type: "bill" as const },
  { value: 20000, label: "$20k", fullLabel: "$20.000", type: "bill" as const },
  { value: 10000, label: "$10k", fullLabel: "$10.000", type: "bill" as const },
  { value: 5000, label: "$5k", fullLabel: "$5.000", type: "bill" as const },
  { value: 2000, label: "$2k", fullLabel: "$2.000", type: "bill" as const },
  { value: 1000, label: "$1k", fullLabel: "$1.000", type: "bill" as const },
  { value: 500, label: "$500", fullLabel: "$500", type: "coin" as const },
  { value: 200, label: "$200", fullLabel: "$200", type: "coin" as const },
  { value: 100, label: "$100", fullLabel: "$100", type: "coin" as const },
  { value: 50, label: "$50", fullLabel: "$50", type: "coin" as const },
];

const QUICK_RECEIVE = [50000, 100000, 200000];

function formatCop(value: number): string {
  return `$${value.toLocaleString("es-CO")}`;
}

function breakdownFromAmount(amount: number): Record<number, number> {
  if (amount <= 0) return {};
  let remaining = amount;
  const result: Record<number, number> = {};
  const sorted = [...DENOMINATIONS].sort((a, b) => b.value - a.value);
  for (const denom of sorted) {
    if (remaining >= denom.value) {
      const count = Math.floor(remaining / denom.value);
      result[denom.value] = count;
      remaining -= count * denom.value;
    }
  }
  return result;
}

export function ChangeCalculator({ totalAmount, onClose }: ChangeCalculatorProps) {
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("parkflow_change_counts");
      if (saved) {
        try {
          return JSON.parse(saved) as Record<number, number>;
        } catch {
          localStorage.removeItem("parkflow_change_counts");
        }
      }
    }
    return {};
  });

  const [customAmount, setCustomAmount] = useState("");
  const [expanded, setExpanded] = useState(true);

  const receivedAmount = Object.entries(counts).reduce(
    (sum, [value, count]) => sum + Number(value) * count,
    0
  );

  const change = receivedAmount - totalAmount;

  const changeBreakdown = useMemo(
    () => (change > 0 ? breakdownFromAmount(change) : {}),
    [change]
  );

  useEffect(() => {
    localStorage.setItem("parkflow_change_counts", JSON.stringify(counts));
  }, [counts]);

  useEffect(() => {
    setCounts({});
    setCustomAmount("");
  }, [totalAmount]);

  const increment = useCallback((value: number) => {
    setCounts((prev) => ({ ...prev, [value]: (prev[value] || 0) + 1 }));
  }, []);

  const decrement = useCallback((value: number) => {
    setCounts((prev) => ({ ...prev, [value]: Math.max(0, (prev[value] || 0) - 1) }));
  }, []);

  const reset = useCallback(() => {
    setCounts({});
    setCustomAmount("");
  }, []);

  const setExactAmount = useCallback(() => {
    setCounts(breakdownFromAmount(totalAmount));
  }, [totalAmount]);

  const applyCustomAmount = useCallback(() => {
    const amount = parseInt(customAmount.replace(/[^0-9]/g, ""), 10) || 0;
    if (amount > 0) {
      setCounts(breakdownFromAmount(amount));
    }
  }, [customAmount]);

  const applyQuickReceive = useCallback((amount: number) => {
    setCounts(breakdownFromAmount(amount));
    setCustomAmount(String(amount));
  }, []);

  const changeStatus =
    change > 0 ? "change" : change === 0 && receivedAmount > 0 ? "exact" : change < 0 ? "short" : "idle";

  if (!expanded) {
    return (
      <Button
        variant="flat"
        color="primary"
        className="w-full font-medium"
        startContent={<Calculator className="w-4 h-4" />}
        endContent={<ChevronDown className="w-4 h-4" />}
        onPress={() => setExpanded(true)}
      >
        Mostrar calculadora de cambio
        {receivedAmount > 0 ? ` · Recibido ${formatCop(receivedAmount)}` : ""}
      </Button>
    );
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-4 space-y-4 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Calculadora de cambio / vuelto
        </h4>
        <button
          onClick={() => setShowCalculator(false)}
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center border border-slate-200 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-slate-500 uppercase">Total</p>
          <p className="text-lg font-bold text-slate-900">
            ${totalAmount.toLocaleString("es-CO")}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-slate-200 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-slate-500 uppercase">Recibido</p>
          <p className={`text-lg font-bold ${receivedAmount > 0 ? "text-blue-600" : "text-slate-400"}`}>
            ${receivedAmount.toLocaleString("es-CO")}
          </p>
        </div>
        <div className={`rounded-xl p-3 text-center border-2 ${
          change >= 0 
            ? change > 0 
              ? "bg-emerald-50 border-emerald-200" 
              : "bg-slate-100 border-slate-200"
            : "bg-rose-50 border-rose-200"
        }`}>
          <p className="text-xs uppercase font-medium">
            {change > 0 ? "Cambio / vuelto" : change === 0 ? "Exacto" : "Falta"}
          </p>
          <p className={`text-lg font-bold ${
            change >= 0 
              ? change > 0 ? "text-emerald-700" : "text-slate-600"
              : "text-rose-700"
          }`}>
            ${Math.abs(change).toLocaleString("es-CO")}
          </p>
        </div>
      </div>

      {/* Atajo: Monto exacto */}
        <div className="flex gap-2">
          <button
            onClick={setExactAmount}
            className="flex-1 py-2 px-3 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-xl text-sm font-medium transition-colors dark:bg-brand-700 dark:text-white dark:hover:bg-brand-600"
          >
          Monto exacto (${totalAmount.toLocaleString("es-CO")})
        </button>
          <button
            onClick={reset}
            className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-medium transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
          Limpiar
        </button>
      </div>

      {/* Entrada personalizada */}
      <div className="flex gap-2">
          <input
            type="text"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Monto recibido (ej: 50000)"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applyCustomAmount();
              }
            }}
          />
        <button
          onClick={applyCustomAmount}
          className="py-2 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700"
        >
          Calcular
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-neutral-700 dark:bg-neutral-950">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
              A cobrar
            </p>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-neutral-50 tabular-nums">
              {formatCop(totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-neutral-700 dark:bg-neutral-950">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
              Recibido
            </p>
            <p
              className={`mt-1 text-base sm:text-lg font-bold tabular-nums ${
                receivedAmount > 0
                  ? "text-primary dark:text-primary"
                  : "text-slate-400 dark:text-neutral-500"
              }`}
            >
              {formatCop(receivedAmount)}
            </p>
          </div>
          <div
            key={denom.value}
            className={`relative rounded-xl border-2 p-2 text-center transition-all ${
              (counts[denom.value] || 0) > 0
                ? "bg-brand-50 border-brand-200"
                : "bg-white border-slate-200 hover:border-slate-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600"
            }`}
          >
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg">{denom.type === "bill" ? "💵" : "🪙"}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">{denom.label}</span>
              </div>
            <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => decrement(denom.value)}
                  className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 font-bold dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-slate-800 dark:text-white">
                  {counts[denom.value] || 0}
                </span>
                <button
                  onClick={() => increment(denom.value)}
                  className="w-6 h-6 rounded-full bg-brand-200 hover:bg-brand-300 flex items-center justify-center text-brand-700 font-bold"
                >
                  +
                </button>
              </div>
            {(counts[denom.value] || 0) > 0 && (
              <div className="mt-1 text-xs font-medium text-brand-700">
                = ${(denom.value * (counts[denom.value] || 0)).toLocaleString("es-CO")}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total desglosado */}
      {receivedAmount > 0 && (
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">Desglose:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts)
              .filter(([, count]) => count > 0)
              .map(([value, count]) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs"
                >
                  {count}x ${parseInt(value).toLocaleString("es-CO")}
                </span>
              ))}
          </div>
        </div>

        {changeStatus === "short" && receivedAmount > 0 ? (
          <p className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 rounded-lg px-3 py-2 border border-rose-200 dark:border-rose-800/50">
            Faltan {formatCop(Math.abs(change))} para completar el cobro.
          </p>
        ) : null}

        {changeStatus === "change" && Object.keys(changeBreakdown).length > 0 ? (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" aria-hidden />
              Sugerencia de vuelto
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(changeBreakdown).map(([value, count]) => {
                const denom = DENOMINATIONS.find((d) => d.value === Number(value));
                return (
                  <span
                    key={value}
                    className="inline-flex items-center rounded-lg bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/60 px-2 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100"
                  >
                    {count}× {denom?.fullLabel ?? formatCop(Number(value))}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2">
          <Button color="primary" variant="flat" className="flex-1 min-w-[140px] font-semibold" onPress={setExactAmount}>
            Monto exacto
          </Button>
          <Button variant="bordered" className="font-medium" onPress={reset}>
            Limpiar
          </Button>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-neutral-400 mb-2">
            Recibido rápido
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_RECEIVE.map((amount) => (
              <Button
                key={amount}
                size="sm"
                variant="bordered"
                className="font-semibold tabular-nums"
                onPress={() => applyQuickReceive(amount)}
              >
                {formatCop(amount)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <Input
            label="Otro monto recibido"
            variant="bordered"
            size="sm"
            value={customAmount}
            onValueChange={setCustomAmount}
            placeholder="Ej: 85000"
            classNames={{
              input: "tabular-nums",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCustomAmount();
            }}
          />
          <Button color="primary" className="font-semibold shrink-0 mb-0.5" onPress={applyCustomAmount}>
            Aplicar
          </Button>
        </div>

        {/* Denominaciones */}
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-neutral-400 mb-2">
            Billetes y monedas recibidos
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {DENOMINATIONS.map((denom) => {
              const count = counts[denom.value] || 0;
              const active = count > 0;
              return (
                <div
                  key={denom.value}
                  className={`rounded-xl border p-2.5 transition-colors ${
                    active
                      ? "border-primary/50 bg-primary/10 dark:bg-primary/15 dark:border-primary/40"
                      : "border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-950 hover:border-slate-300 dark:hover:border-neutral-600"
                  }`}
                >
                  <p className="text-center text-xs font-semibold text-slate-800 dark:text-neutral-200 mb-2">
                    {denom.fullLabel}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      aria-label={`Menos ${denom.fullLabel}`}
                      onClick={() => decrement(denom.value)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                    >
                      −
                    </button>
                    <span className="min-w-[1.5rem] text-center text-lg font-bold tabular-nums text-slate-900 dark:text-neutral-50">
                      {count}
                    </span>
                    <button
                      type="button"
                      aria-label={`Más ${denom.fullLabel}`}
                      onClick={() => increment(denom.value)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold hover:opacity-90"
                    >
                      +
                    </button>
                  </div>
                  {active ? (
                    <p className="mt-2 text-center text-[11px] font-medium text-primary tabular-nums">
                      = {formatCop(denom.value * count)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {receivedAmount > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400 mb-2">
              Desglose recibido
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(counts)
                .filter(([, c]) => c > 0)
                .map(([value, c]) => (
                  <span
                    key={value}
                    className="inline-flex rounded-lg bg-slate-100 dark:bg-neutral-800 px-2 py-1 text-xs font-medium text-slate-800 dark:text-neutral-200 tabular-nums"
                  >
                    {c}× {formatCop(Number(value))}
                  </span>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
