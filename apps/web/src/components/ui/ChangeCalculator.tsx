"use client";

import { useState, useEffect, useCallback } from "react";

interface ChangeCalculatorProps {
  totalAmount: number;
  onClose?: () => void;
}

const DENOMINATIONS = [
  { value: 50000, label: "$50.000", type: "bill" as const },
  { value: 20000, label: "$20.000", type: "bill" as const },
  { value: 10000, label: "$10.000", type: "bill" as const },
  { value: 5000, label: "$5.000", type: "bill" as const },
  { value: 2000, label: "$2.000", type: "bill" as const },
  { value: 1000, label: "$1.000", type: "bill" as const },
  { value: 500, label: "$500", type: "coin" as const },
  { value: 200, label: "$200", type: "coin" as const },
  { value: 100, label: "$100", type: "coin" as const },
  { value: 50, label: "$50", type: "coin" as const }
];

export function ChangeCalculator({ totalAmount, onClose }: ChangeCalculatorProps) {
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    // Inicializar desde localStorage si existe
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("parkflow_change_counts");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          localStorage.removeItem("parkflow_change_counts");
        }
      }
    }
    return {};
  });
  
  const [customAmount, setCustomAmount] = useState("");
  const [showCalculator, setShowCalculator] = useState(true);

  const receivedAmount = Object.entries(counts).reduce(
    (sum, [value, count]) => sum + parseInt(value) * count,
    0
  );

  const change = receivedAmount - totalAmount;

  // Guardar counts en localStorage
  useEffect(() => {
    localStorage.setItem("parkflow_change_counts", JSON.stringify(counts));
  }, [counts]);

  useEffect(() => {
    setCounts({});
    setCustomAmount("");
  }, [totalAmount]);

  const increment = useCallback((value: number) => {
    setCounts(prev => ({
      ...prev,
      [value]: (prev[value] || 0) + 1
    }));
  }, []);

  const decrement = useCallback((value: number) => {
    setCounts(prev => ({
      ...prev,
      [value]: Math.max(0, (prev[value] || 0) - 1)
    }));
  }, []);

  const reset = useCallback(() => {
    setCounts({});
    setCustomAmount("");
  }, []);

  const setExactAmount = useCallback(() => {
    // Encontrar la combinación más simple para el monto exacto
    let remaining = totalAmount;
    const newCounts: Record<number, number> = {};
    
    // Ordenar denominaciones de mayor a menor
    const sortedDenoms = [...DENOMINATIONS].sort((a, b) => b.value - a.value);
    
    for (const denom of sortedDenoms) {
      if (remaining >= denom.value) {
        const count = Math.floor(remaining / denom.value);
        newCounts[denom.value] = count;
        remaining -= count * denom.value;
      }
    }
    
    setCounts(newCounts);
  }, [totalAmount]);

  const applyCustomAmount = useCallback(() => {
    const amount = parseInt(customAmount.replace(/[^0-9]/g, "")) || 0;
    if (amount > 0) {
      // Simular el monto recibido
      let remaining = amount;
      const newCounts: Record<number, number> = {};
      const sortedDenoms = [...DENOMINATIONS].sort((a, b) => b.value - a.value);
      
      for (const denom of sortedDenoms) {
        if (remaining >= denom.value) {
          const count = Math.floor(remaining / denom.value);
          newCounts[denom.value] = count;
          remaining -= count * denom.value;
        }
      }
      
      setCounts(newCounts);
    }
  }, [customAmount]);

  if (!showCalculator) {
    return (
      <button
        onClick={() => setShowCalculator(true)}
        className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Mostrar calculadora
      </button>
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

      {/* Contadores de billetes/monedas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {DENOMINATIONS.map((denom) => (
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
      )}
    </div>
  );
}
