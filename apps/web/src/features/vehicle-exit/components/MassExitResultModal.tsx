"use client";

import { Modal } from "@/components/bridge/Modal";
import { Button } from "@/components/bridge/Button";
import { CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";
import type { MassExitResponseDto, MassExitItemResultDto } from "@/lib/api/mass-exit-api";

type Props = {
  result: MassExitResponseDto;
  onClose: () => void;
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(val);
}

function StatusBadge({ status }: { status: MassExitItemResultDto["status"] }) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle className="w-3 h-3" /> Exitoso
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
        <XCircle className="w-3 h-3" /> Fallido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <AlertCircle className="w-3 h-3" /> Omitido
    </span>
  );
}

function exportCsv(result: MassExitResponseDto) {
  const headers = ["Ticket", "Placa", "Tipo", "Sede", "Entrada", "Estado", "Cobrado", "Error"];
  const rows = result.items.map((i) => [
    i.ticketNumber,
    i.plate ?? "",
    i.vehicleType ?? "",
    i.site ?? "",
    i.entryAt,
    i.status,
    String(i.amountCharged),
    i.errorMessage ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `salida-masiva-${result.batchId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MassExitResultModal({ result, onClose }: Props) {
  const allSuccess = result.failCount === 0;
  const hasFailures = result.failCount > 0;

  return (
    <Modal isOpen onOpenChange={(open: boolean) => !open && onClose()} size="xl">
      <Modal.Header>
        <div className="flex items-center gap-3">
          {allSuccess ? (
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          ) : (
            <AlertCircle className="w-7 h-7 text-amber-500" />
          )}
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-600 font-medium mb-0.5">Resultado</p>
            <h3 className="text-lg font-semibold text-slate-800">
              {allSuccess ? "Salida masiva completada" : "Salida masiva con errores"}
            </h3>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: result.totalCandidates, color: "slate" },
            { label: "Exitosos", value: result.successCount, color: "emerald" },
            { label: "Fallidos", value: result.failCount, color: hasFailures ? "rose" : "slate" },
            { label: "Omitidos", value: result.skippedCount, color: "amber" },
            { label: "Cobrado", value: formatCurrency(result.totalCharged), color: "violet" },
            { label: "Tiempo", value: `${(result.durationMs / 1000).toFixed(1)}s`, color: "slate" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className={`p-3 rounded-xl border text-center
                ${color === "emerald" ? "bg-emerald-50 border-emerald-200" :
                  color === "rose" ? "bg-rose-50 border-rose-200" :
                  color === "amber" ? "bg-amber-50 border-amber-200" :
                  color === "violet" ? "bg-violet-50 border-violet-200" :
                  "bg-slate-50 border-slate-200"}`}
            >
              <p className="text-xs text-slate-500 uppercase font-semibold">{label}</p>
              <p className={`text-lg font-bold
                ${color === "emerald" ? "text-emerald-700" :
                  color === "rose" ? "text-rose-700" :
                  color === "amber" ? "text-amber-700" :
                  color === "violet" ? "text-violet-700" :
                  "text-slate-800"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Batch ID */}
        <p className="text-xs text-slate-400">
          Lote: <span className="font-mono">{result.batchId}</span>
        </p>

        {/* Items table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Placa</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Ticket</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Estado</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600">Cobrado</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 hidden md:table-cell">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-mono text-slate-800">{item.plate ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{item.ticketNumber}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">
                      {item.status === "SUCCESS" ? formatCurrency(item.amountCharged) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-rose-600 hidden md:table-cell max-w-48 truncate">
                      {item.errorMessage ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="flat"
          color="default"
          startContent={<Download className="w-4 h-4" />}
          onPress={() => exportCsv(result)}
        >
          Exportar CSV
        </Button>
        <Button color="primary" onPress={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
