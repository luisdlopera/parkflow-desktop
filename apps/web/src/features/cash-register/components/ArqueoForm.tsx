"use client";
import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/bridge/Input";
import { TextArea } from "@/components/bridge/TextArea";
import { Button } from "@/components/bridge/Button";

function CountDiffIndicator({ countCash, countCard, countTransfer, countOther, expectedLedgerTotal }: any) {
  const parsed =
    (Number(String(countCash).replace(",", ".")) || 0) +
    (Number(String(countCard).replace(",", ".")) || 0) +
    (Number(String(countTransfer).replace(",", ".")) || 0) +
    (Number(String(countOther).replace(",", ".")) || 0);
  const diff = parsed - expectedLedgerTotal;
  if (parsed === 0) return null;
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${diff === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <p>
        <strong>Total contado:</strong> ${parsed.toLocaleString()} &mdash; <strong>Esperado:</strong> ${expectedLedgerTotal.toLocaleString()}
        {diff !== 0 ? (
          <span className="font-semibold"> &mdash; <strong>Diferencia:</strong> {diff > 0 ? "+" : ""}${diff.toLocaleString()}
            <span className="ml-1 text-amber-700">(requiere observaciones)</span>
          </span>
        ) : (
          <span className="text-emerald-700 font-semibold"> &mdash; Coincide ✓</span>
        )}
      </p>
    </div>
  );
}

export default function ArqueoForm({ p }: any) {
  return (
    <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
      <h2 className="text-lg font-semibold text-slate-900">Arqueo</h2>
      <p className="mt-2 text-sm text-slate-600">Si hay diferencia respecto al esperado, las observaciones son obligatorias.</p>
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Controller name="countCash" control={p.countForm.control}
          render={({ field }) => <Input label="Efectivo contado" size="sm" type="number" {...field} />}
        />
        <Controller name="countCard" control={p.countForm.control}
          render={({ field }) => <Input label="Tarjetas" size="sm" type="number" {...field} />}
        />
        <Controller name="countTransfer" control={p.countForm.control}
          render={({ field }) => <Input label="Transferencias" size="sm" type="number" {...field} />}
        />
        <Controller name="countOther" control={p.countForm.control}
          render={({ field }) => <Input label="Otros" size="sm" type="number" {...field} />}
        />
      </div>
      {p.summary && (
        <CountDiffIndicator
          countCash={p.countCash}
          countCard={p.countCard}
          countTransfer={p.countTransfer}
          countOther={p.countOther}
          expectedLedgerTotal={p.summary.expectedLedgerTotal}
        />
      )}
      <div className="mt-4">
        <Controller name="countNotes" control={p.countForm.control}
          render={({ field }) => {
            const parsedTotal =
              (Number(String(p.countCash).replace(",", ".")) || 0) +
              (Number(String(p.countCard).replace(",", ".")) || 0) +
              (Number(String(p.countTransfer).replace(",", ".")) || 0) +
              (Number(String(p.countOther).replace(",", ".")) || 0);
            const hasDiff = !!p.summary && parsedTotal !== p.summary.expectedLedgerTotal;
            return (
              <TextArea
                label="Observaciones de arqueo"
                placeholder={hasDiff ? "OBLIGATORIAS: hay diferencia respecto al esperado" : "Describa cualquier novedad..."}
                isInvalid={hasDiff && !p.countNotes.trim()}
                errorMessage={hasDiff && !p.countNotes.trim() ? "Las observaciones son obligatorias cuando el conteo difiere del esperado" : ""}
                {...field}
              />
            );
          }}
        />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1 font-bold" color="primary"
          isDisabled={p.busy} isLoading={p.busy}
          onPress={() => { p.countForm.handleSubmit(p.onCount)().catch(() => {}); }}>
          Guardar arqueo
        </Button>
        <Button className="flex-1 font-semibold" variant="outline" color="primary"
          isDisabled={p.busy || !p.session?.countedAt}
          onPress={() => { p.onPrintCount().catch(() => {}); }}>
          Imprimir comprobante de arqueo
        </Button>
      </div>
    </div>
  );
}
