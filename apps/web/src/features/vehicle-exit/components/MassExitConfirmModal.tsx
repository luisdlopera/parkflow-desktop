"use client";

import { Modal } from "@/components/bridge/Modal";
import { Button } from "@/components/bridge/Button";
import { AlertTriangle } from "lucide-react";
import type { MassExitItemResultDto, MassExitPreviewResponseDto } from "@/lib/api/mass-exit-api";
import type { UseMassExitReturn } from "../hooks/useMassExit";

type Props = Pick<
  UseMassExitReturn,
  "preview" | "reason" | "chargeMode" | "isProcessing" | "processError" | "handleConfirm" | "reset"
>;

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(val);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ item }: { item: MassExitItemResultDto }) {
  if (item.status === "SKIPPED") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        Omitido
      </span>
    );
  }
  return null;
}

export function MassExitConfirmModal({ preview, reason, chargeMode, isProcessing, processError, handleConfirm, reset }: Props) {
  if (!preview) return null;

  const canConfirm = reason.trim().length > 0;
  const eligibleCount = preview.items.filter((i) => i.status !== "SKIPPED").length;

  return (
    <Modal isOpen onOpenChange={(open: boolean) => !open && reset()} size="xl">
      <Modal.Header>
        <div>
          <p className="text-xs uppercase tracking-widest text-violet-600 font-medium mb-0.5">Paso 2</p>
          <h3 className="text-lg font-semibold text-foreground">Confirmar Salida Masiva</h3>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-default-50 rounded-xl border border-default-200 text-center">
            <p className="text-xs text-default-500 uppercase font-semibold">Candidatos</p>
            <p className="text-2xl font-bold text-foreground">{preview.totalCandidates}</p>
          </div>
          <div className="p-3 bg-default-50 rounded-xl border border-default-200 text-center">
            <p className="text-xs text-default-500 uppercase font-semibold">A procesar</p>
            <p className="text-2xl font-bold text-foreground">{eligibleCount}</p>
          </div>
          <div className="p-3 bg-default-50 rounded-xl border border-default-200 text-center">
            <p className="text-xs text-default-500 uppercase font-semibold">Modo cobro</p>
            <p className="text-sm font-semibold text-default-700 mt-1">
              {chargeMode === "FREE" ? "Sin cobro" : chargeMode === "CUSTOM" ? "Personalizado" : "Normal"}
            </p>
          </div>
          <div className="p-3 bg-default-50 rounded-xl border border-default-200 text-center">
            <p className="text-xs text-default-500 uppercase font-semibold">Total estimado</p>
            <p className="text-lg font-bold text-violet-700">
              {chargeMode === "FREE" ? "$0" : formatCurrency(preview.estimatedTotal)}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {preview.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
            <p className="text-xs font-semibold text-amber-700 uppercase">
              {preview.warnings.length} advertencia(s)
            </p>
            {preview.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700">{w}</p>
            ))}
          </div>
        )}

        {/* Vehicle list */}
        <div className="border border-default-200 rounded-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-default-50 border-b border-default-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-default-600">Placa</th>
                  <th className="text-left px-3 py-2 font-semibold text-default-600">Ticket</th>
                  <th className="text-left px-3 py-2 font-semibold text-default-600 hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-3 py-2 font-semibold text-default-600 hidden md:table-cell">Entrada</th>
                  <th className="text-right px-3 py-2 font-semibold text-default-600">Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.items.map((item, idx) => (
                  <tr key={idx} className={item.status === "SKIPPED" ? "opacity-50" : ""}>
                    <td className="px-3 py-2 font-mono text-foreground">{item.plate ?? "—"}</td>
                    <td className="px-3 py-2 text-default-600">{item.ticketNumber}</td>
                    <td className="px-3 py-2 text-default-600 hidden sm:table-cell">
                      {item.vehicleType ?? "—"}
                      <StatusBadge item={item} />
                    </td>
                    <td className="px-3 py-2 text-default-500 hidden md:table-cell">
                      {item.entryAt ? formatTime(item.entryAt) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {item.status === "SKIPPED"
                        ? "—"
                        : chargeMode === "FREE"
                          ? "$0"
                          : formatCurrency(item.amountCharged)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Irreversible warning */}
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700">Operación irreversible</p>
            <p className="text-xs text-rose-600 mt-0.5">
              Se procesará la salida de <strong>{eligibleCount} vehículos</strong>. Esta acción no puede deshacerse. El motivo registrado será: <em>&ldquo;{reason}&rdquo;</em>
            </p>
          </div>
        </div>

        {processError && (
          <div className="text-sm text-rose-600 p-3 rounded-lg border border-rose-200 bg-rose-50">
            {processError}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="flat" color="default" onPress={reset} isDisabled={isProcessing}>
          Cancelar
        </Button>
        <Button
          color="danger"
          onPress={handleConfirm}
          isLoading={isProcessing}
          isDisabled={!canConfirm || isProcessing || eligibleCount === 0}
        >
          {isProcessing ? "Procesando..." : `Confirmar salida de ${eligibleCount} vehículo(s)`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
