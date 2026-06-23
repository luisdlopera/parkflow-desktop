"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
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

  // ⚡ Bolt: Removed O(N log N) sort inside the calculation loop.
  // DENOMINATIONS is already sorted in descending order statically.
  for (const denom of DENOMINATIONS) {
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
        variant="tertiary"
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
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-neutral-700 dark:bg-neutral-900/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Calculator className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-neutral-100 text-sm truncate">
              Calculadora de cambio
            </h4>
            <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">
              Cuente lo que recibe y vea el vuelto al instante
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Limpiar calculadora"
            onPress={reset}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Ocultar calculadora"
            onPress={() => {
              setExpanded(false);
              onClose?.();
            }}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
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
            className={`rounded-xl border-2 p-3 text-center ${
              changeStatus === "change"
                ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-500/40"
                : changeStatus === "exact"
                  ? "border-primary/40 bg-primary/10 dark:bg-primary/15"
                  : changeStatus === "short"
                    ? "border-rose-500/50 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-500/40"
                    : "border-slate-200 bg-slate-100 dark:border-neutral-700 dark:bg-neutral-800/50"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                changeStatus === "change"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : changeStatus === "exact"
                    ? "text-primary"
                    : changeStatus === "short"
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-slate-500 dark:text-neutral-400"
              }`}
            >
              {changeStatus === "change"
                ? "Vuelto"
                : changeStatus === "exact"
                  ? "Exacto"
                  : changeStatus === "short"
                    ? "Falta"
                    : "Pendiente"}
            </p>
            <p
              className={`mt-1 text-base sm:text-lg font-bold tabular-nums ${
                changeStatus === "change"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : changeStatus === "exact"
                    ? "text-primary"
                    : changeStatus === "short"
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-slate-500 dark:text-neutral-400"
              }`}
            >
              {formatCop(Math.abs(change))}
            </p>
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
          <Button color="primary" variant="tertiary" className="flex-1 min-w-[140px] font-semibold" onPress={setExactAmount}>
            Monto exacto
          </Button>
          <Button variant="outline" className="font-medium" onPress={reset}>
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
                variant="outline"
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
            
            size="sm"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
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
