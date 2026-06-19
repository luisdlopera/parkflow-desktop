"use client";
import { Modal } from "@heroui/react";
import { Button } from "@/components/bridge/Button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { BulkExitCalculateResponseDto, BulkExitResponseDto } from "@/lib/api/bulk-exit-api";

export function BulkExitConfirmModal({
  precalculation,
  isProcessing,
  availablePaymentMethods,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  onConfirm,
  onCancel,
}: {
  precalculation: BulkExitCalculateResponseDto;
  isProcessing: boolean;
  availablePaymentMethods: { code: string; label: string }[];
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: (m: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onCancel()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Confirmar Salida Masiva</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Vehículos</p>
                <p className="text-xl font-bold">{precalculation.totalVehicles}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Subtotal</p>
                <p className="text-xl font-bold text-slate-700">${precalculation.totalSubtotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Descuentos</p>
                <p className="text-xl font-bold text-green-600">-${precalculation.totalDiscount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total a Cobrar</p>
                <p className="text-xl font-bold text-brand-600">${precalculation.finalTotal.toLocaleString()}</p>
              </div>
            </div>
            {precalculation.errors && precalculation.errors.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Vehículos con anomalías (se excluirán/fallarán):
                </p>
                <ul className="list-disc pl-5 mt-1">
                  {precalculation.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                </ul>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-semibold">Placa</th>
                    <th className="px-4 py-2 text-slate-500 font-semibold">Ticket</th>
                    <th className="px-4 py-2 text-slate-500 font-semibold text-right">Total</th>
                    <th className="px-4 py-2 text-slate-500 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {precalculation.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 font-medium">{item.plate}</td>
                      <td className="px-4 py-2 text-slate-500">{item.ticketNumber}</td>
                      <td className="px-4 py-2 text-right font-semibold">${item.total.toLocaleString()}</td>
                      <td className="px-4 py-2 text-center">
                        {item.errorMessage
                          ? <span className="text-rose-500 text-xs font-bold" title={item.errorMessage}>Error</span>
                          : <span className="text-emerald-500 text-xs font-bold">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Modal.Body>
          <Modal.Footer className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="paymentMethod" className="text-sm font-semibold text-slate-700">Método de pago:</label>
              <select
                id="paymentMethod"
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="text-sm border border-slate-300 rounded-md px-2 py-1"
                disabled={isProcessing}
              >
                {availablePaymentMethods.map((m) => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button color="default" variant="ghost" onPress={onCancel}>Cancelar</Button>
              <Button color="warning" onPress={onConfirm} isLoading={isProcessing}>Confirmar e Imprimir</Button>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function BulkExitSuccessModal({ result, onClose }: { result: BulkExitResponseDto; onClose: () => void }) {
  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="sm">
        <Modal.Dialog className="text-center p-6 space-y-4">
          <div className="flex justify-center">
            {result.failedCount === 0
              ? <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><CheckCircle className="w-8 h-8" /></div>
              : <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><AlertTriangle className="w-8 h-8" /></div>}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{result.failedCount === 0 ? "Proceso Exitoso" : "Proceso Parcial"}</h3>
            <p className="text-slate-500 mt-2">
              Se procesaron <b>{result.successfulCount}</b> vehículos correctamente.
              {result.failedCount > 0 && <span className="text-rose-600 font-medium"> ({result.failedCount} fallaron)</span>}
            </p>
            <p className="text-2xl font-black text-brand-600 mt-4">${result.totalCharged.toLocaleString()}</p>
          </div>
          <Button color="primary" className="w-full" onPress={onClose}>Cerrar</Button>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
