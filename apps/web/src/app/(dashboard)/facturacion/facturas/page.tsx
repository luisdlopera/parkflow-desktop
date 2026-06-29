"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchInvoices,
  cancelInvoice,
  type Invoice,
  type InvoiceStatus,
  type InvoiceProviderType,
} from "@/lib/api/billing-api";
import { toast } from "@heroui/react";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  PAID: "Pagada",
  REJECTED: "Rechazada",
  CANCELLED: "Anulada",
};

const STATUS_CHIP: Record<InvoiceStatus, string> = {
  DRAFT: "bg-default-100 text-default-500",
  PENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-default-100 text-default-400 line-through",
};

const PROVIDER_LABELS: Record<InvoiceProviderType, string> = {
  ALEGRA: "Alegra", SIIGO: "Siigo", FACTURATECH: "FacturaTech", CARVAJAL: "Carvajal",
  LOGGRO: "Loggro", QUICKBOOKS: "QuickBooks", XERO: "Xero", ZOHO: "Zoho", STRIPE: "Stripe",
  SAP: "SAP", NETSUITE: "NetSuite", DYNAMICS: "Dynamics", ODOO: "Odoo",
};

export default function FacturasPage() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">(
    (searchParams.get("status") as InvoiceStatus) || ""
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<{ id: string; number: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = (p = 0) => {
    setLoading(true);
    fetchInvoices({ status: statusFilter || undefined, page: p, size: 20 })
      .then((resp) => {
        setInvoices(resp.content);
        setTotal(resp.totalElements);
        setPage(p);
      })
      .catch(() => toast.danger("No se pudo cargar las facturas"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(0); }, [statusFilter]);

  const handleCancel = async () => {
    if (!showCancelModal || !cancelReason.trim()) return;
    setCancellingId(showCancelModal.id);
    try {
      await cancelInvoice(showCancelModal.id, cancelReason);
      toast.success(`Factura ${showCancelModal.number} anulada`);
      setShowCancelModal(null);
      setCancelReason("");
      load(page);
    } catch {
      toast.danger("No se pudo anular la factura");
    } finally {
      setCancellingId(null);
    }
  };

  const fmtCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Facturas Electrónicas</h1>
          <p className="mt-1 text-sm text-default-500">{total} facturas en total</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "")}
            className="rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos los estados</option>
            {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-default-200 bg-default-50 dark:bg-default-100">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-default-200 border-t-primary" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium text-default-600">No hay facturas</p>
            <p className="text-xs text-default-400">Las facturas aparecen aquí cuando se generan automáticamente o de forma manual</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default-200 text-left">
                <th className="px-5 py-3 font-semibold text-default-600">Número</th>
                <th className="px-5 py-3 font-semibold text-default-600">Externo</th>
                <th className="px-5 py-3 font-semibold text-default-600">Proveedor</th>
                <th className="px-5 py-3 font-semibold text-default-600">Total</th>
                <th className="px-5 py-3 font-semibold text-default-600">Estado</th>
                <th className="px-5 py-3 font-semibold text-default-600">Fecha</th>
                <th className="px-5 py-3 font-semibold text-default-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-default-100 last:border-0 hover:bg-default-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{inv.number}</td>
                  <td className="px-5 py-3 text-xs text-default-500">{inv.externalNumber ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-default-600">{PROVIDER_LABELS[inv.providerType] ?? inv.providerType}</td>
                  <td className="px-5 py-3 font-semibold text-foreground">{fmtCurrency(inv.total, inv.currency)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-default-500">{fmtDate(inv.createdAt)}</td>
                  <td className="px-5 py-3">
                    {inv.status !== "CANCELLED" && inv.status !== "DRAFT" && (
                      <button
                        onClick={() => setShowCancelModal({ id: inv.id, number: inv.number })}
                        className="text-xs font-semibold text-danger-600 hover:underline"
                      >
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => load(page - 1)}
            className="rounded-lg border border-default-200 px-3 py-1.5 text-xs font-semibold text-default-700 disabled:opacity-40 hover:bg-default-50"
          >
            Anterior
          </button>
          <span className="text-xs text-default-500">Página {page + 1} de {Math.ceil(total / 20)}</span>
          <button
            disabled={(page + 1) * 20 >= total}
            onClick={() => load(page + 1)}
            className="rounded-lg border border-default-200 px-3 py-1.5 text-xs font-semibold text-default-700 disabled:opacity-40 hover:bg-default-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-default-100/30">
          <div className="w-full max-w-md rounded-xl border border-default-200 bg-default-50 dark:bg-default-100 p-6">
            <h3 className="font-semibold text-foreground">Anular factura {showCancelModal.number}</h3>
            <p className="mt-1 text-sm text-default-500">
              Esta acción notificará al proveedor de facturación para anular el documento electrónico.
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-default-700">Motivo de anulación</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Ej: Error en valor cobrado"
                className="w-full rounded-lg border border-default-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setShowCancelModal(null); setCancelReason(""); }}
                className="flex-1 rounded-lg border border-default-200 py-2 text-sm font-semibold text-default-700 hover:bg-default-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancellingId !== null}
                className="flex-1 rounded-lg bg-danger py-2 text-sm font-semibold text-default-50 hover:opacity-90 disabled:opacity-50"
              >
                {cancellingId ? "Anulando..." : "Confirmar anulación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
