"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Chip, Progress } from "@heroui/react";
import DataTable from "@/components/ui/DataTable";
import KpiCard from "@/components/ui/KpiCard";
import { buildApiHeaders } from "@/lib/api";
import { hasPermission } from "@/lib/auth";

type ReportView =
  | "daily-operations"
  | "cash-session"
  | "vehicle-type"
  | "paid-tickets"
  | "voided-tickets"
  | "income-expense"
  | "occupancy"
  | "by-operator"
  | "by-payment-method";

/* ───── Daily Operations ───── */
type DailyOpsRow = { date: string; entries: number; exits: number; lostTickets: number; cashTotal: number; cardTotal: number; transferTotal: number; otherTotal: number; grandTotal: number };

/* ───── Cash Session ───── */
type CashSessionRow = { id: string; openedAt: string; closedAt: string | null; operatorName: string | null; status: string; openingAmount: number; expectedAmount: number; countedAmount: number | null; difference: number | null; movementCount: number };
type CashSummary = { openingAmount: number; expectedLedgerTotal: number; countedTotal: number | null; difference: number | null; totalsByPaymentMethod: Record<string, number>; totalsByMovementType: Record<string, number>; movementCount: number } | null;

/* ───── Vehicle Type ───── */
type VehicleTypeRow = { vehicleType: string; activeCount: number; entriesToday: number; exitsToday: number; revenueToday: number };

/* ───── Paid Tickets ───── */
type PaidTicketRow = { ticketNumber: string; plate: string; vehicleType: string; amount: number; paymentMethod: string; paidAt: string; entryAt: string };
type VoidedTicketRow = { id: string; movementType: string; displayName: string; paymentMethod: string; amount: number; reason: string | null; voidReason: string | null; voidedByName: string | null; voidedAt: string; createdAt: string; cashSessionId: string };

/* ───── Income / Expense ───── */
type IncomeExpense = { incomeTotal: number; expenseTotal: number; netTotal: number; breakdown: { movementType: string; displayName: string; amount: number; count: number }[] };

/* ───── Occupancy ───── */
type Occupancy = { totalSpaces: number; occupiedSpaces: number; availableSpaces: number; occupancyPercentage: number; byVehicleType: { vehicleType: string; occupied: number }[] };

/* ───── By Operator ───── */
type OperatorRow = { operatorId: string; operatorName: string; transactionCount: number; totalAmount: number; cashAmount: number; cardAmount: number; transferAmount: number; otherAmount: number };

/* ───── By Payment Method ───── */
type PaymentMethodRow = { paymentMethod: string; displayName: string; transactionCount: number; totalAmount: number; percentage: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1";

function todayStr(): string { return new Date().toISOString().split("T")[0]; }

function fmt(n: number): string {
  return `$${n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function dateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch { return iso; }
}

let pmLabels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  CASH: "Efectivo",
  TARJETA_CREDITO: "Tarjeta Crédito",
  TARJETA_DEBITO: "Tarjeta Débito",
  CARD: "Tarjeta",
  DEBIT_CARD: "Tarjeta Débito",
  CREDIT_CARD: "Tarjeta Crédito",
  TRANSFER: "Transferencia",
  TRANSFERENCIA: "Transferencia",
  NEQUI: "Nequi",
  DAVIPLATA: "DaviPlata",
  QR: "QR",
  MIXTO: "Mixto",
};

function pmLabel(k: string): string {
  const upper = k.toUpperCase().replace(/\s+/g, "_");
  return pmLabels[upper] ?? k;
}

function toCsv(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const CARD_ICONS: Record<ReportView, string> = {
  "daily-operations": "📊",
  "cash-session": "🔒",
  "vehicle-type": "🚗",
  "paid-tickets": "🧾",
  "voided-tickets": "🚫",
  "income-expense": "💰",
  "occupancy": "📈",
  "by-operator": "👤",
  "by-payment-method": "💳",
};

type CardDef = { key: ReportView; label: string; desc: string };

const GRID: CardDef[] = [
  { key: "daily-operations", label: "Ventas del día", desc: "Entradas, salidas e ingresos por día" },
  { key: "cash-session", label: "Cierre de caja", desc: "Sesiones de caja, conteos y diferencias" },
  { key: "vehicle-type", label: "Vehículos activos", desc: "Ocupación actual por tipo de vehículo" },
  { key: "paid-tickets", label: "Tickets cobrados", desc: "Pagos realizados por ticket" },
  { key: "voided-tickets", label: "Tickets anulados", desc: "Anulaciones y reembolsos" },
  { key: "income-expense", label: "Ingresos / Egresos", desc: "Resumen de movimientos de caja" },
  { key: "occupancy", label: "Ocupación", desc: "Capacidad usada vs disponible" },
  { key: "by-operator", label: "Por cajero", desc: "Desempeño por operador" },
  { key: "by-payment-method", label: "Por método de pago", desc: "Recaudo segmentado por método" },
];

export default function ReportesPage() {
  const [canView, setCanView] = useState(false);
  const [view, setView] = useState<ReportView | null>(null);

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* data per report */
  const [dailyOps, setDailyOps] = useState<DailyOpsRow[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSessionRow[]>([]);
  const [cashSummary, setCashSummary] = useState<CashSummary>(null);
  const [vehicleType, setVehicleType] = useState<VehicleTypeRow[]>([]);
  const [paidTickets, setPaidTickets] = useState<PaidTicketRow[]>([]);
  const [incomeExpense, setIncomeExpense] = useState<IncomeExpense | null>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [voidedTickets, setVoidedTickets] = useState<VoidedTicketRow[]>([]);

  useEffect(() => {
    hasPermission("reportes:leer").then(setCanView).catch(() => setCanView(false));
  }, []);

  const fetchJson = useCallback(async (path: string): Promise<any> => {
    const res = await fetch(`${API_BASE}${path}`, { headers: await buildApiHeaders() });
    if (!res.ok) throw new Error((await res.json()).error ?? `Error ${res.status}`);
    return res.json();
  }, []);

  const loadReport = useCallback(async (report: ReportView) => {
    setLoading(true);
    setError(null);
    try {
      if (report === "daily-operations") {
        const p = new URLSearchParams();
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        const data: DailyOpsRow[] = await fetchJson(`/reports/daily-operations?${p.toString()}`);
        setDailyOps(data);
      } else if (report === "cash-session") {
        const sessions: CashSessionRow[] = await fetchJson("/reports/cash-session-history?limit=20&offset=0");
        setCashSessions(sessions);
        if (sessions.length > 0) {
          try {
            const summary = await fetchJson(`/reports/cash-session-summary?sessionId=${sessions[0].id}`);
            setCashSummary(summary as CashSummary);
          } catch { setCashSummary(null); }
        }
      } else if (report === "vehicle-type") {
        const data: VehicleTypeRow[] = await fetchJson("/reports/vehicle-type");
        setVehicleType(data);
      } else if (report === "paid-tickets") {
        const p = new URLSearchParams();
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        const data: PaidTicketRow[] = await fetchJson(`/reports/paid-tickets?${p.toString()}`);
        setPaidTickets(data);
      } else if (report === "voided-tickets") {
        const p = new URLSearchParams();
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        const data: VoidedTicketRow[] = await fetchJson(`/reports/voided-tickets?${p.toString()}`);
        setVoidedTickets(data);
      } else if (report === "income-expense") {
        const p = new URLSearchParams();
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        const data: IncomeExpense = await fetchJson(`/reports/income-expense?${p.toString()}`);
        setIncomeExpense(data);
      } else if (report === "occupancy") {
        const data: Occupancy = await fetchJson("/reports/occupancy");
        setOccupancy(data);
      } else if (report === "by-operator") {
        const p = new URLSearchParams();
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        const data: OperatorRow[] = await fetchJson(`/reports/by-operator?${p.toString()}`);
        setOperators(data);
      } else if (report === "by-payment-method") {
        const p = new URLSearchParams();
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        const data: PaymentMethodRow[] = await fetchJson(`/reports/by-payment-method?${p.toString()}`);
        setPaymentMethods(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, fetchJson]);

  const openReport = (r: ReportView) => {
    setView(r);
    loadReport(r).catch(console.error);
  };

  const backToGrid = () => { setView(null); setError(null); };

  const handleExport = () => {
    if (!view) return;
    const filename = `reporte-${view}-${todayStr()}.csv`;

    switch (view) {
      case "daily-operations": {
        toCsv(
          ["Fecha", "Entradas", "Salidas", "Perdidos", "Efectivo", "Tarjeta", "Transferencia", "Otros", "Total"],
          dailyOps.map((r) => [r.date, String(r.entries), String(r.exits), String(r.lostTickets), r.cashTotal.toFixed(0), r.cardTotal.toFixed(0), r.transferTotal.toFixed(0), r.otherTotal.toFixed(0), r.grandTotal.toFixed(0)]),
          filename,
        );
        break;
      }
      case "cash-session": {
        toCsv(
          ["ID", "Apertura", "Cierre", "Operador", "Estado", "Base", "Esperado", "Contado", "Diferencia", "Movs"],
          cashSessions.map((r) => [r.id, r.openedAt, r.closedAt ?? "", r.operatorName ?? "", r.status, r.openingAmount.toFixed(0), r.expectedAmount.toFixed(0), r.countedAmount != null ? r.countedAmount.toFixed(0) : "", r.difference != null ? r.difference.toFixed(0) : "", String(r.movementCount)]),
          filename,
        );
        break;
      }
      case "vehicle-type": {
        toCsv(
          ["Tipo", "Activos", "Entradas", "Salidas", "Recaudo"],
          vehicleType.map((r) => [r.vehicleType, String(r.activeCount), String(r.entriesToday), String(r.exitsToday), r.revenueToday.toFixed(0)]),
          filename,
        );
        break;
      }
      case "paid-tickets": {
        toCsv(
          ["Ticket", "Placa", "Tipo", "Monto", "Método", "Pagado", "Ingreso"],
          paidTickets.map((r) => [r.ticketNumber, r.plate, r.vehicleType, r.amount.toFixed(0), pmLabel(r.paymentMethod), shortDate(r.paidAt), shortDate(r.entryAt)]),
          filename,
        );
        break;
      }
      case "income-expense": {
        if (!incomeExpense) return;
        toCsv(
          ["Tipo", "Movimiento", "Monto", "Cantidad"],
          incomeExpense.breakdown.map((r) => [r.amount >= 0 ? "Ingreso" : "Egreso", r.displayName, r.amount.toFixed(0), String(r.count)]),
          filename,
        );
        break;
      }
      case "occupancy": {
        if (!occupancy) return;
        toCsv(
          ["Total", "Ocupados", "Disponibles", "% Ocupación"],
          [[String(occupancy.totalSpaces), String(occupancy.occupiedSpaces), String(occupancy.availableSpaces), occupancy.occupancyPercentage.toFixed(1)]],
          filename,
        );
        break;
      }
      case "by-operator": {
        toCsv(
          ["Operador", "Transacciones", "Total", "Efectivo", "Tarjeta", "Transferencia", "Otros"],
          operators.map((r) => [r.operatorName, String(r.transactionCount), r.totalAmount.toFixed(0), r.cashAmount.toFixed(0), r.cardAmount.toFixed(0), r.transferAmount.toFixed(0), r.otherAmount.toFixed(0)]),
          filename,
        );
        break;
      }
      case "voided-tickets": {
        toCsv(
          ["Tipo", "Método", "Monto", "Motivo", "Anulado por", "Anulado", "Creado"],
          voidedTickets.map((r) => [r.displayName, pmLabel(r.paymentMethod), r.amount.toFixed(0), r.voidReason ?? "", r.voidedByName ?? "", shortDate(r.voidedAt), shortDate(r.createdAt)]),
          filename,
        );
        break;
      }
      case "by-payment-method": {
        toCsv(
          ["Método", "Transacciones", "Total", "%"],
          paymentMethods.map((r) => [r.displayName, String(r.transactionCount), r.totalAmount.toFixed(0), r.percentage.toFixed(1)]),
          filename,
        );
        break;
      }
    }
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">Reportes</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Reportes</h1>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          No tienes permiso para ver reportes.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">Reportes</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            {view ? GRID.find((c) => c.key === view)?.label ?? "Reporte" : "Reportes operativos"}
          </h1>
        </div>
        {view ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="flat" color="default" onPress={backToGrid}>
              ← Volver
            </Button>
            <Button size="sm" variant="flat" color="primary" isDisabled={loading} isLoading={loading} onPress={() => loadReport(view).catch(console.error)}>
              Actualizar
            </Button>
            <Button size="sm" variant="bordered" color="primary" onPress={handleExport}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div>
      ) : null}

      {/* Grid ─────────────────────────────────────────── */}
      {!view && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {GRID.map((card) => (
            <button
              key={card.key}
              onClick={() => openReport(card.key)}
              className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <div className="text-2xl mb-2">{CARD_ICONS[card.key]}</div>
              <h3 className="text-base font-semibold text-slate-900">{card.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Daily Operations ──────────────────────────────── */}
      {view === "daily-operations" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <Input type="date" variant="flat" size="sm" label="Desde" value={dateFrom} onValueChange={setDateFrom} className="w-[150px]" />
            <span className="text-slate-400">—</span>
            <Input type="date" variant="flat" size="sm" label="Hasta" value={dateTo} onValueChange={setDateTo} className="w-[150px]" />
          </div>
          {dailyOps.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Entradas" value={String(dailyOps.reduce((s, r) => s + r.entries, 0))} />
              <KpiCard title="Salidas" value={String(dailyOps.reduce((s, r) => s + r.exits, 0))} />
              <KpiCard title="Ingresos" value={fmt(dailyOps.reduce((s, r) => s + r.grandTotal, 0))} />
              <KpiCard title="Días" value={String(dailyOps.length)} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<DailyOpsRow>
              columns={[
                { key: "date", label: "Fecha", priority: "high" },
                { key: "entries", label: "Entradas", align: "right" },
                { key: "exits", label: "Salidas", align: "right" },
                { key: "lostTickets", label: "Perdidos", align: "right" },
                { key: "cashTotal", label: "Efectivo", align: "right", render: (r) => fmt(r.cashTotal) },
                { key: "cardTotal", label: "Tarjeta", align: "right", render: (r) => fmt(r.cardTotal) },
                { key: "transferTotal", label: "Transferencia", align: "right", render: (r) => fmt(r.transferTotal) },
                { key: "grandTotal", label: "Total", align: "right", render: (r) => fmt(r.grandTotal) },
              ]}
              rows={dailyOps}
              emptyMessage="No hay operaciones en el periodo seleccionado."
            />
          </div>
        </>
      )}

      {/* Cash Session ──────────────────────────────────── */}
      {view === "cash-session" && (
        <>
          {cashSummary && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Base" value={fmt(cashSummary.openingAmount)} />
              <KpiCard title="Esperado" value={fmt(cashSummary.expectedLedgerTotal)} />
              <KpiCard title="Contado" value={cashSummary.countedTotal != null ? fmt(cashSummary.countedTotal) : "—"} />
              <KpiCard title="Diferencia" value={cashSummary.difference != null ? fmt(cashSummary.difference) : "—"} />
            </div>
          )}
          {cashSummary && cashSummary.totalsByPaymentMethod && Object.keys(cashSummary.totalsByPaymentMethod).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Totales por método de pago</h3>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {Object.entries(cashSummary.totalsByPaymentMethod).map(([method, total]) => (
                  <div key={method} className="border border-slate-100 rounded-xl p-3">
                    <p className="text-xs text-slate-500 uppercase">{pmLabel(method)}</p>
                    <p className="text-lg font-semibold text-slate-900">{fmt(total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<CashSessionRow>
              columns={[
                { key: "openedAt", label: "Apertura", render: (r) => dateLabel(r.openedAt) },
                { key: "closedAt", label: "Cierre", render: (r) => r.closedAt ? dateLabel(r.closedAt) : "—" },
                { key: "operatorName", label: "Operador", render: (r) => r.operatorName ?? "—" },
                { key: "status", label: "Estado" },
                { key: "openingAmount", label: "Base", align: "right", render: (r) => fmt(r.openingAmount) },
                { key: "expectedAmount", label: "Esperado", align: "right", render: (r) => fmt(r.expectedAmount) },
                { key: "countedAmount", label: "Contado", align: "right", render: (r) => r.countedAmount != null ? fmt(r.countedAmount) : "—" },
                { key: "difference", label: "Dif.", align: "right", render: (r) => r.difference != null ? fmt(r.difference) : "—" },
                { key: "movementCount", label: "Movs", align: "right" },
              ]}
              rows={cashSessions}
              emptyMessage="No hay sesiones de caja registradas."
            />
          </div>
        </>
      )}

      {/* Vehicle Type ──────────────────────────────────── */}
      {view === "vehicle-type" && (
        <>
          {vehicleType.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Tipos" value={String(vehicleType.length)} />
              <KpiCard title="Activos" value={String(vehicleType.reduce((s, r) => s + r.activeCount, 0))} />
              <KpiCard title="Entradas hoy" value={String(vehicleType.reduce((s, r) => s + r.entriesToday, 0))} />
              <KpiCard title="Recaudo hoy" value={fmt(vehicleType.reduce((s, r) => s + r.revenueToday, 0))} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<VehicleTypeRow>
              columns={[
                { key: "vehicleType", label: "Tipo", priority: "high" },
                { key: "activeCount", label: "Activos", align: "right" },
                { key: "entriesToday", label: "Entradas hoy", align: "right" },
                { key: "exitsToday", label: "Salidas hoy", align: "right" },
                { key: "revenueToday", label: "Recaudo hoy", align: "right", render: (r) => fmt(r.revenueToday) },
              ]}
              rows={vehicleType}
              emptyMessage="No hay datos de vehículos."
            />
          </div>
        </>
      )}

      {/* Paid Tickets ──────────────────────────────────── */}
      {view === "paid-tickets" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <Input type="date" variant="flat" size="sm" label="Desde" value={dateFrom} onValueChange={setDateFrom} className="w-[150px]" />
            <span className="text-slate-400">—</span>
            <Input type="date" variant="flat" size="sm" label="Hasta" value={dateTo} onValueChange={setDateTo} className="w-[150px]" />
          </div>
          {paidTickets.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3">
              <KpiCard title="Tickets" value={String(paidTickets.length)} />
              <KpiCard title="Total cobrado" value={fmt(paidTickets.reduce((s, r) => s + r.amount, 0))} />
              <KpiCard title="Ticket promedio" value={paidTickets.length > 0 ? fmt(paidTickets.reduce((s, r) => s + r.amount, 0) / paidTickets.length) : "$0"} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<PaidTicketRow>
              columns={[
                { key: "ticketNumber", label: "Ticket", priority: "high" },
                { key: "plate", label: "Placa" },
                { key: "vehicleType", label: "Tipo" },
                { key: "amount", label: "Monto", align: "right", render: (r) => fmt(r.amount) },
                { key: "paymentMethod", label: "Método", render: (r) => pmLabel(r.paymentMethod) },
                { key: "paidAt", label: "Pagado", render: (r) => shortDate(r.paidAt) },
              ]}
              rows={paidTickets}
              emptyMessage="No hay tickets cobrados en el periodo seleccionado."
            />
          </div>
        </>
      )}

      {/* Voided Tickets ────────────────────────────────── */}
      {view === "voided-tickets" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <Input type="date" variant="flat" size="sm" label="Desde" value={dateFrom} onValueChange={setDateFrom} className="w-[150px]" />
            <span className="text-slate-400">—</span>
            <Input type="date" variant="flat" size="sm" label="Hasta" value={dateTo} onValueChange={setDateTo} className="w-[150px]" />
          </div>
          {voidedTickets.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3">
              <KpiCard title="Anulaciones" value={String(voidedTickets.length)} />
              <KpiCard title="Total anulado" value={fmt(voidedTickets.reduce((s, r) => s + r.amount, 0))} />
              <KpiCard title="Ticket promedio" value={voidedTickets.length > 0 ? fmt(voidedTickets.reduce((s, r) => s + r.amount, 0) / voidedTickets.length) : "$0"} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<VoidedTicketRow>
              columns={[
                { key: "displayName", label: "Tipo", priority: "high" },
                { key: "paymentMethod", label: "Método", render: (r) => pmLabel(r.paymentMethod) },
                { key: "amount", label: "Monto", align: "right", render: (r) => fmt(r.amount) },
                { key: "voidReason", label: "Motivo anulación", render: (r) => r.voidReason ?? "—" },
                { key: "voidedByName", label: "Anulado por", render: (r) => r.voidedByName ?? "—" },
                { key: "voidedAt", label: "Anulado", render: (r) => dateLabel(r.voidedAt) },
                { key: "createdAt", label: "Creado", render: (r) => dateLabel(r.createdAt) },
              ]}
              rows={voidedTickets}
              emptyMessage="No hay anulaciones en el periodo seleccionado."
            />
          </div>
        </>
      )}

      {/* Income / Expense ──────────────────────────────── */}
      {view === "income-expense" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <Input type="date" variant="flat" size="sm" label="Desde" value={dateFrom} onValueChange={setDateFrom} className="w-[150px]" />
            <span className="text-slate-400">—</span>
            <Input type="date" variant="flat" size="sm" label="Hasta" value={dateTo} onValueChange={setDateTo} className="w-[150px]" />
          </div>
          {incomeExpense && (
            <>
              <div className="grid gap-4 sm:gap-5 grid-cols-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 font-medium">Ingresos</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{fmt(incomeExpense.incomeTotal)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wide text-red-700 font-medium">Egresos</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{fmt(incomeExpense.expenseTotal)}</p>
                </div>
                <div className={`border rounded-2xl p-5 ${incomeExpense.netTotal >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
                  <p className="text-xs uppercase tracking-wide font-medium">Neto</p>
                  <p className={`text-2xl font-bold mt-1 ${incomeExpense.netTotal >= 0 ? "text-blue-900" : "text-orange-900"}`}>
                    {fmt(incomeExpense.netTotal)}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                <DataTable<{ movementType: string; displayName: string; amount: number; count: number }>
                  columns={[
                    { key: "displayName", label: "Movimiento", priority: "high" },
                    { key: "amount", label: "Monto", align: "right", render: (r) => fmt(r.amount) },
                    { key: "count", label: "Cantidad", align: "right" },
                    {
                      key: "movementType", label: "Tipo", render: (r) => {
                        const isIncome = ["PARKING_PAYMENT", "LOST_TICKET_PAYMENT", "MANUAL_INCOME", "REPRINT_FEE"].includes(r.movementType);
                        return (
                          <Chip size="sm" variant="flat" color={isIncome ? "success" : "danger"}>
                            {isIncome ? "Ingreso" : "Egreso"}
                          </Chip>
                        );
                      },
                    },
                  ]}
                  rows={incomeExpense?.breakdown ?? []}
                  emptyMessage="No hay movimientos en el periodo seleccionado."
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Occupancy ──────────────────────────────────────── */}
      {view === "occupancy" && occupancy && (
        <>
          <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Capacidad total" value={String(occupancy.totalSpaces)} />
            <KpiCard title="Ocupados" value={String(occupancy.occupiedSpaces)} />
            <KpiCard title="Disponibles" value={String(occupancy.availableSpaces)} />
            <KpiCard title="% Ocupación" value={fmtPct(occupancy.occupancyPercentage)} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Ocupación actual</h3>
              <span className="text-xs text-slate-500">
                {occupancy.occupiedSpaces} de {occupancy.totalSpaces} espacios
              </span>
            </div>
            <Progress
              aria-label="Ocupación"
              value={occupancy.occupancyPercentage}
              color={occupancy.occupancyPercentage > 80 ? "danger" : occupancy.occupancyPercentage > 50 ? "warning" : "success"}
              className="h-4"
            />
            {occupancy.byVehicleType.length > 0 && (
              <div className="mt-5">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Por tipo de vehículo</h4>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                  {occupancy.byVehicleType.map((vt) => (
                    <div key={vt.vehicleType} className="border border-slate-100 rounded-xl p-3">
                      <p className="text-xs text-slate-500 uppercase">{vt.vehicleType}</p>
                      <p className="text-lg font-semibold text-slate-900">{vt.occupied}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* By Operator ────────────────────────────────────── */}
      {view === "by-operator" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <Input type="date" variant="flat" size="sm" label="Desde" value={dateFrom} onValueChange={setDateFrom} className="w-[150px]" />
            <span className="text-slate-400">—</span>
            <Input type="date" variant="flat" size="sm" label="Hasta" value={dateTo} onValueChange={setDateTo} className="w-[150px]" />
          </div>
          {operators.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Cajeros" value={String(operators.length)} />
              <KpiCard title="Total transacciones" value={String(operators.reduce((s, r) => s + r.transactionCount, 0))} />
              <KpiCard title="Total recaudo" value={fmt(operators.reduce((s, r) => s + r.totalAmount, 0))} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<OperatorRow>
              columns={[
                { key: "operatorName", label: "Operador", priority: "high" },
                { key: "transactionCount", label: "Transacciones", align: "right" },
                { key: "totalAmount", label: "Total", align: "right", render: (r) => fmt(r.totalAmount) },
                { key: "cashAmount", label: "Efectivo", align: "right", render: (r) => fmt(r.cashAmount) },
                { key: "cardAmount", label: "Tarjeta", align: "right", render: (r) => fmt(r.cardAmount) },
                { key: "transferAmount", label: "Transferencia", align: "right", render: (r) => fmt(r.transferAmount) },
              ]}
              rows={operators}
              emptyMessage="No hay movimientos de cajeros en el periodo seleccionado."
            />
          </div>
        </>
      )}

      {/* By Payment Method ──────────────────────────────── */}
      {view === "by-payment-method" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <Input type="date" variant="flat" size="sm" label="Desde" value={dateFrom} onValueChange={setDateFrom} className="w-[150px]" />
            <span className="text-slate-400">—</span>
            <Input type="date" variant="flat" size="sm" label="Hasta" value={dateTo} onValueChange={setDateTo} className="w-[150px]" />
          </div>
          {paymentMethods.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {paymentMethods.map((pm) => (
                <div key={pm.paymentMethod} className="bg-white border border-slate-200 rounded-2xl p-4 flex-1 min-w-[140px]">
                  <p className="text-xs text-slate-500 uppercase">{pm.displayName}</p>
                  <p className="text-lg font-semibold text-slate-900 mt-0.5">{fmt(pm.totalAmount)}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{pm.transactionCount} trans.</span>
                    <span className="text-xs font-medium text-slate-600">{pm.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress aria-label={pm.displayName} value={pm.percentage} color="primary" className="h-1.5 mt-1.5" />
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<PaymentMethodRow>
              columns={[
                { key: "displayName", label: "Método", priority: "high" },
                { key: "transactionCount", label: "Transacciones", align: "right" },
                { key: "totalAmount", label: "Total", align: "right", render: (r) => fmt(r.totalAmount) },
                { key: "percentage", label: "%", align: "right", render: (r) => fmtPct(r.percentage) },
              ]}
              rows={paymentMethods}
              emptyMessage="No hay pagos registrados en el periodo seleccionado."
            />
          </div>
        </>
      )}
    </div>
  );
}
