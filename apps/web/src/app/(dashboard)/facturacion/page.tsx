"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchBillingDashboard, type InvoiceDashboard } from "@/lib/api/billing-api";

const STATUS_COLORS: Record<string, string> = {
  issued: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-default-50 text-default-500 border-default-200",
};

interface MetricCard {
  label: string;
  value: string | number;
  colorKey: string;
  href: string;
}

export default function FacturacionPage() {
  const [dashboard, setDashboard] = useState<InvoiceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchBillingDashboard()
      .then(setDashboard)
      .catch(() => setError("No se pudo cargar el dashboard de facturación"))
      .finally(() => setLoading(false));
  }, []);

  const cards: MetricCard[] = dashboard
    ? [
        { label: "Facturas emitidas", value: dashboard.totalIssued, colorKey: "issued", href: "/facturacion/facturas?status=SENT" },
        { label: "Pendientes DIAN", value: dashboard.pendingDian, colorKey: "pending", href: "/facturacion/facturas?status=PENDING" },
        { label: "Rechazadas", value: dashboard.rejected, colorKey: "rejected", href: "/facturacion/facturas?status=REJECTED" },
        { label: "Anuladas", value: dashboard.cancelled, colorKey: "cancelled", href: "/facturacion/facturas?status=CANCELLED" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Facturación Electrónica</h1>
        <p className="mt-1 text-sm text-default-500">
          Gestión de facturas, notas crédito y débito conectadas con tu proveedor configurado.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-default-200 bg-default-50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.colorKey}
              href={card.href}
              className={`rounded-xl border p-5 transition-opacity hover:opacity-80 ${STATUS_COLORS[card.colorKey]}`}
            >
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs font-medium">{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      {dashboard && (
        <div className="rounded-xl border border-default-200 bg-default-50 px-5 py-4">
          <p className="text-xs text-default-500">Total facturado este mes</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: dashboard.currency || "COP",
              minimumFractionDigits: 0,
            }).format(dashboard.totalAmountMonth)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/facturacion/configuracion"
          className="rounded-xl border border-default-200 bg-default-50 dark:bg-default-100 p-5 transition-colors hover:bg-default-100"
        >
          <p className="font-semibold text-foreground">⚙ Configurar proveedor</p>
          <p className="mt-1 text-xs text-default-500">Alegra, Siigo, Xero y más</p>
        </Link>
        <Link
          href="/facturacion/facturas"
          className="rounded-xl border border-default-200 bg-default-50 dark:bg-default-100 p-5 transition-colors hover:bg-default-100"
        >
          <p className="font-semibold text-foreground">📄 Ver facturas</p>
          <p className="mt-1 text-xs text-default-500">Listado, filtros y exportación</p>
        </Link>
        <Link
          href="/facturacion/logs"
          className="rounded-xl border border-default-200 bg-default-50 dark:bg-default-100 p-5 transition-colors hover:bg-default-100"
        >
          <p className="font-semibold text-foreground">🔍 Logs de sincronización</p>
          <p className="mt-1 text-xs text-default-500">Solicitudes, respuestas y errores</p>
        </Link>
      </div>
    </div>
  );
}
