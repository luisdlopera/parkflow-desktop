"use client";
import React from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { TextArea } from "@/components/bridge/TextArea";

export default function CloseSessionPanel({ p, confirm }: any) {
  return (
    <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
      <h3 className="text-lg font-semibold text-slate-900">Cierre</h3>
      <p className="mt-2 text-xs text-slate-500">El usuario que ejecuta el cierre queda registrado en el sistema.</p>
      <div className="mt-4">
        <Controller name="closeNotes" control={p.closeForm.control}
          render={({ field }) => (
            <TextArea label="Notas de cierre" placeholder="Obligatorias si hay diferencia..." {...field} />
          )}
        />
      </div>
      <div className="mt-4">
        <Input label="Testigo / responsable firma (opcional)" placeholder="Nombre legible..."
          value={p.closingWitness} onChange={(e) => p.setClosingWitness(e.target.value)} />
      </div>
      {p.session && !p.session.countedAt ? (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          ⚠ Debe realizar el arqueo antes de poder cerrar la caja.
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button color="danger" variant="tertiary" className="flex-1 font-bold"
          isDisabled={p.busy || !p.session?.countedAt} isLoading={p.busy}
          onPress={() => { p.onClose(() => confirm("Confirma cierre de caja? No se podran agregar movimientos despues.")).catch(() => {}); }}>
          Cerrar caja (Fin turno)
        </Button>
        <Button color="primary" variant="tertiary" className="flex-1 font-bold"
          isDisabled={p.busy || !p.session?.countedAt}
          onPress={() => p.setShowShiftChangeModal(true)}>
          Cambio de turno
        </Button>
      </div>
    </div>
  );
}
