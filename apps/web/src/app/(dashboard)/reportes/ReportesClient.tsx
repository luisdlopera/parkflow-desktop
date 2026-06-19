"use client";

import { useEffect, useState, useMemo } from "react";
import { Chip } from "@/components/ui/Chip";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import dynamic from "next/dynamic";
import DateRangeInput from "@/components/ui/DateRangeInput";
import { hasPermission } from "@/lib/auth";
import { BarChart3, Lock, Car, Receipt, Ban, DollarSign, TrendingUp, User, CreditCard } from "lucide-react";
import { useReports, fmt, fmtPct, dateLabel, shortDate, pmLabel, getOccupancyColor } from "@/features/reports/hooks/useReports";
import type { ReportView } from "@/features/reports/hooks/useReports";

const KpiCard = dynamic(() => import("@/components/ui/KpiCard"), { ssr: false });

const CARD_ICONS: Record<ReportView, React.ReactNode> = {
  "daily-operations": <BarChart3 className="w-6 h-6" />,
  "cash-session": <Lock className="w-6 h-6" />,
  "vehicle-type": <Car className="w-6 h-6" />,
  "paid-tickets": <Receipt className="w-6 h-6" />,
  "voided-tickets": <Ban className="w-6 h-6" />,
  "income-expense": <DollarSign className="w-6 h-6" />,
  "occupancy": <TrendingUp className="w-6 h-6" />,
  "by-operator": <User className="w-6 h-6" />,
  "by-payment-method": <CreditCard className="w-6 h-6" />,
};

const GRID = [
  { key: "daily-operations" as ReportView, label: "Ventas del día", desc: "Entradas, salidas e ingresos por día" },
  { key: "cash-session" as ReportView, label: "Cierre de caja", desc: "Sesiones de caja, conteos y diferencias" },
  { key: "vehicle-type" as ReportView, label: "Vehículos activos", desc: "Ocupación actual por tipo de vehículo" },
  { key: "paid-tickets" as ReportView, label: "Tickets cobrados", desc: "Pagos realizados por ticket" },
  { key: "voided-tickets" as ReportView, label: "Tickets anulados", desc: "Anulaciones y reembolsos" },
  { key: "income-expense" as ReportView, label: "Ingresos / Egresos", desc: "Resumen de movimientos de caja" },
  { key: "occupancy" as ReportView, label: "Ocupación", desc: "Capacidad usada vs disponible" },
  { key: "by-operator" as ReportView, label: "Por cajero", desc: "Desempeño por operador" },
  { key: "by-payment-method" as ReportView, label: "Por método de pago", desc: "Recaudo segmentado por método" },
];

export default function ReportesClient() {
  const [canView, setCanView] = useState(false);
  const [view, setView] = useState<ReportView | null>(null);
  const { dateFrom, setDateFrom, dateTo, setDateTo, loading, error, setError, dailyOps, cashSessions, cashSummary, vehicleType, paidTickets, voidedTickets, incomeExpense, occupancy, operators, paymentMethods, loadReport, handleExport } = useReports();

  useEffect(() => {
    hasPermission("reportes:leer").then(setCanView).catch(() => setCanView(false));
  }, []);

  const openReport = (r: ReportView) => { setView(r); loadReport(r).catch(console.error); };
  const backToGrid = () => { setView(null); setError(null); };

  const PAGE_SIZE = 50;
  const [ticketPage, setTicketPage] = useState(1);
  const [opsPage, setOpsPage] = useState(1);

  const paginatedPaidTickets = useMemo(() => {
    const start = (ticketPage - 1) * PAGE_SIZE;
    return paidTickets.slice(start, start + PAGE_SIZE);
  }, [paidTickets, ticketPage]);

  const paginatedDailyOps = useMemo(() => {
    const start = (opsPage - 1) * PAGE_SIZE;
    return dailyOps.slice(start, start + PAGE_SIZE);
  }, [dailyOps, opsPage]);

  useEffect(() => {
    setTicketPage(1);
    setOpsPage(1);
  }, [view]);

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
        {view && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="tertiary" color="default" onPress={backToGrid}>← Volver</Button>
            <Button size="sm" variant="tertiary" color="primary" isDisabled={loading} isLoading={loading} onPress={() => loadReport(view).catch(console.error)}>Actualizar</Button>
            <Button size="sm" variant="outline" color="primary" onPress={() => handleExport(view)}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </Button>
          </div>
        )}
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div>}

      {!view && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {GRID.map((card) => (
            <button key={card.key} onClick={() => openReport(card.key)} className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-300 transition-all duration-200 active:scale-[0.98]">
              <div className="text-2xl mb-2">{CARD_ICONS[card.key]}</div>
              <h3 className="text-base font-semibold text-slate-900">{card.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
            </button>
          ))}
        </div>
      )}

      {view === "daily-operations" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <DateRangeInput from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
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
            <DataTable<(typeof dailyOps)[number]> columns={[
              { key: "date", label: "Fecha", priority: "high" },
              { key: "entries", label: "Entradas", align: "right" },
              { key: "exits", label: "Salidas", align: "right" },
              { key: "lostTickets", label: "Perdidos", align: "right" },
              { key: "cashTotal", label: "Efectivo", align: "right", render: (r) => fmt(r.cashTotal) },
              { key: "cardTotal", label: "Tarjeta", align: "right", render: (r) => fmt(r.cardTotal) },
              { key: "transferTotal", label: "Transferencia", align: "right", render: (r) => fmt(r.transferTotal) },
              { key: "grandTotal", label: "Total", align: "right", render: (r) => fmt(r.grandTotal) },
            ]} rows={paginatedDailyOps} emptyMessage="No hay operaciones en el periodo seleccionado."
              pagination={{ page: opsPage, pageSize: PAGE_SIZE, total: dailyOps.length }}
              onPaginationChange={(page, _size) => setOpsPage(page)}
            />
          </div>
        </>
      )}

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
          {cashSummary?.totalsByPaymentMethod && Object.keys(cashSummary.totalsByPaymentMethod).length > 0 && (
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
            <DataTable<(typeof cashSessions)[number]> columns={[
              { key: "openedAt", label: "Apertura", render: (r) => dateLabel(r.openedAt) },
              { key: "closedAt", label: "Cierre", render: (r) => r.closedAt ? dateLabel(r.closedAt) : "—" },
              { key: "operatorName", label: "Operador", render: (r) => r.operatorName ?? "—" },
              { key: "status", label: "Estado" },
              { key: "openingAmount", label: "Base", align: "right", render: (r) => fmt(r.openingAmount) },
              { key: "expectedAmount", label: "Esperado", align: "right", render: (r) => fmt(r.expectedAmount) },
              { key: "countedAmount", label: "Contado", align: "right", render: (r) => r.countedAmount != null ? fmt(r.countedAmount) : "—" },
              { key: "difference", label: "Dif.", align: "right", render: (r) => r.difference != null ? fmt(r.difference) : "—" },
              { key: "movementCount", label: "Movs", align: "right" },
            ]} rows={cashSessions} emptyMessage="No hay sesiones de caja registradas." />
          </div>
        </>
      )}

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
            <DataTable<(typeof vehicleType)[number]> columns={[
              { key: "vehicleType", label: "Tipo", priority: "high" },
              { key: "activeCount", label: "Activos", align: "right" },
              { key: "entriesToday", label: "Entradas hoy", align: "right" },
              { key: "exitsToday", label: "Salidas hoy", align: "right" },
              { key: "revenueToday", label: "Recaudo hoy", align: "right", render: (r) => fmt(r.revenueToday) },
            ]} rows={vehicleType} emptyMessage="No hay datos de vehículos." />
          </div>
        </>
      )}

      {view === "paid-tickets" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <DateRangeInput from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          </div>
          {paidTickets.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3">
              <KpiCard title="Tickets" value={String(paidTickets.length)} />
              <KpiCard title="Total cobrado" value={fmt(paidTickets.reduce((s, r) => s + r.amount, 0))} />
              <KpiCard title="Ticket promedio" value={paidTickets.length > 0 ? fmt(paidTickets.reduce((s, r) => s + r.amount, 0) / paidTickets.length) : "$0"} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<(typeof paidTickets)[number]> columns={[
              { key: "ticketNumber", label: "Ticket", priority: "high" },
              { key: "plate", label: "Placa" },
              { key: "vehicleType", label: "Tipo" },
              { key: "amount", label: "Monto", align: "right", render: (r) => fmt(r.amount) },
              { key: "paymentMethod", label: "Método", render: (r) => pmLabel(r.paymentMethod) },
              { key: "paidAt", label: "Pagado", render: (r) => shortDate(r.paidAt) },
            ]} rows={paginatedPaidTickets} emptyMessage="No hay tickets cobrados en el periodo seleccionado."
              pagination={{ page: ticketPage, pageSize: PAGE_SIZE, total: paidTickets.length }}
              onPaginationChange={(page, _size) => setTicketPage(page)}
            />
          </div>
        </>
      )}

      {view === "voided-tickets" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <DateRangeInput from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          </div>
          {voidedTickets.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3">
              <KpiCard title="Anulaciones" value={String(voidedTickets.length)} />
              <KpiCard title="Total anulado" value={fmt(voidedTickets.reduce((s, r) => s + r.amount, 0))} />
              <KpiCard title="Ticket promedio" value={voidedTickets.length > 0 ? fmt(voidedTickets.reduce((s, r) => s + r.amount, 0) / voidedTickets.length) : "$0"} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<(typeof voidedTickets)[number]> columns={[
              { key: "displayName", label: "Tipo", priority: "high" },
              { key: "paymentMethod", label: "Método", render: (r) => pmLabel(r.paymentMethod) },
              { key: "amount", label: "Monto", align: "right", render: (r) => fmt(r.amount) },
              { key: "voidReason", label: "Motivo anulación", render: (r) => r.voidReason ?? "—" },
              { key: "voidedByName", label: "Anulado por", render: (r) => r.voidedByName ?? "—" },
              { key: "voidedAt", label: "Anulado", render: (r) => dateLabel(r.voidedAt) },
              { key: "createdAt", label: "Creado", render: (r) => dateLabel(r.createdAt) },
            ]} rows={voidedTickets} emptyMessage="No hay anulaciones en el periodo seleccionado." />
          </div>
        </>
      )}

      {view === "income-expense" && incomeExpense && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <DateRangeInput from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          </div>
          <div className="grid gap-4 sm:gap-5 grid-cols-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-emerald-700 font-medium">Ingresos</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{fmt(incomeExpense.incomeTotal)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wide text-red-700 font-medium">Egresos</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{fmt(incomeExpense.expenseTotal)}</p>
            </div>
            <div className={`border rounded-2xl p-5 ${incomeExpense.netTotal >= 0 ? "bg-blue-50 border-blue-200" : "bg-primary-50 border-primary-200"}`}>
              <p className="text-xs uppercase tracking-wide font-medium">Neto</p>
              <p className={`text-2xl font-bold mt-1 ${incomeExpense.netTotal >= 0 ? "text-blue-900" : "text-primary-900"}`}>{fmt(incomeExpense.netTotal)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<(typeof incomeExpense.breakdown)[number]> columns={[
              { key: "displayName", label: "Movimiento", priority: "high" },
              { key: "amount", label: "Monto", align: "right", render: (r) => fmt(r.amount) },
              { key: "count", label: "Cantidad", align: "right" },
              { key: "movementType", label: "Tipo", render: (r) => {
                const isIncome = ["PARKING_PAYMENT", "LOST_TICKET_PAYMENT", "MANUAL_INCOME", "REPRINT_FEE"].includes(r.movementType);
                return <Chip size="sm" variant="soft" color={isIncome ? "success" : "danger"}>{isIncome ? "Ingreso" : "Egreso"}</Chip>;
              }},
            ]} rows={incomeExpense.breakdown} emptyMessage="No hay movimientos en el periodo seleccionado." />
          </div>
        </>
      )}

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
              <span className="text-xs text-slate-500">{occupancy.occupiedSpaces} de {occupancy.totalSpaces} espacios</span>
            </div>
            <Progress aria-label="Ocupación" value={occupancy.occupancyPercentage} color={getOccupancyColor(occupancy.occupancyPercentage)} className="h-4" />
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

      {view === "by-operator" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <DateRangeInput from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          </div>
          {operators.length > 0 && (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Cajeros" value={String(operators.length)} />
              <KpiCard title="Total transacciones" value={String(operators.reduce((s, r) => s + r.transactionCount, 0))} />
              <KpiCard title="Total recaudo" value={fmt(operators.reduce((s, r) => s + r.totalAmount, 0))} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <DataTable<(typeof operators)[number]> columns={[
              { key: "operatorName", label: "Operador", priority: "high" },
              { key: "transactionCount", label: "Transacciones", align: "right" },
              { key: "totalAmount", label: "Total", align: "right", render: (r) => fmt(r.totalAmount) },
              { key: "cashAmount", label: "Efectivo", align: "right", render: (r) => fmt(r.cashAmount) },
              { key: "cardAmount", label: "Tarjeta", align: "right", render: (r) => fmt(r.cardAmount) },
              { key: "transferAmount", label: "Transferencia", align: "right", render: (r) => fmt(r.transferAmount) },
            ]} rows={operators} emptyMessage="No hay movimientos de cajeros en el periodo seleccionado." />
          </div>
        </>
      )}

      {view === "by-payment-method" && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
            <DateRangeInput from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
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
            <DataTable<(typeof paymentMethods)[number]> columns={[
              { key: "displayName", label: "Método", priority: "high" },
              { key: "transactionCount", label: "Transacciones", align: "right" },
              { key: "totalAmount", label: "Total", align: "right", render: (r) => fmt(r.totalAmount) },
              { key: "percentage", label: "%", align: "right", render: (r) => fmtPct(r.percentage) },
            ]} rows={paymentMethods} emptyMessage="No hay pagos registrados en el periodo seleccionado." />
          </div>
        </>
      )}
    </div>
  );
}
