"use client";
import { useCallback, useState } from "react";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import {
  fetchDailyOperations,
  fetchCashSessionHistory,
  fetchCashSessionSummary,
  fetchVehicleTypeReport,
  fetchPaidTickets,
  fetchVoidedTickets,
  fetchIncomeExpense,
  fetchOccupancy,
  fetchByOperator,
  fetchByPaymentMethod,
} from "../services/reports.service";
import type {
  ReportView,
  DailyOpsRow,
  CashSessionRow,
  CashSummary,
  VehicleTypeRow,
  PaidTicketRow,
  VoidedTicketRow,
  IncomeExpense,
  Occupancy,
  OperatorRow,
  PaymentMethodRow,
} from "../services/reports.service";

export type { ReportView };

const pmLabels: Record<string, string> = {
  EFECTIVO: "Efectivo", CASH: "Efectivo",
  TARJETA_CREDITO: "Tarjeta Crédito", TARJETA_DEBITO: "Tarjeta Débito",
  CARD: "Tarjeta", DEBIT_CARD: "Tarjeta Débito", CREDIT_CARD: "Tarjeta Crédito",
  TRANSFER: "Transferencia", TRANSFERENCIA: "Transferencia",
  NEQUI: "Nequi", DAVIPLATA: "DaviPlata", QR: "QR", MIXTO: "Mixto",
};

export function pmLabel(k: string): string {
  return pmLabels[k.toUpperCase().replace(/\s+/g, "_")] ?? k;
}

export function fmt(n: number): string {
  return `$${n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtPct(n: number): string { return `${n.toFixed(1)}%`; }

export function dateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return iso; }
}

export function todayStr(): string {
  // Use locale date in Colombia timezone to avoid UTC cutoff issues
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

export function getOccupancyColor(percentage: number): "danger" | "warning" | "success" {
  if (percentage > 80) return "danger";
  if (percentage > 50) return "warning";
  return "success";
}

function toCsv(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const STORAGE_KEY_FROM = "parkflow_report_dateFrom";
const STORAGE_KEY_TO = "parkflow_report_dateTo";

function readPersistedDate(key: string, fallback: string): string {
  try {
    return sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function useReports() {
  const today = todayStr();
  const [dateFrom, _setDateFrom] = useState(() => readPersistedDate(STORAGE_KEY_FROM, today));
  const [dateTo, _setDateTo] = useState(() => readPersistedDate(STORAGE_KEY_TO, today));

  const setDateFrom = useCallback((v: string) => {
    _setDateFrom(v);
    try { sessionStorage.setItem(STORAGE_KEY_FROM, v); } catch { /* noop */ }
  }, []);

  const setDateTo = useCallback((v: string) => {
    _setDateTo(v);
    try { sessionStorage.setItem(STORAGE_KEY_TO, v); } catch { /* noop */ }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dailyOps, setDailyOps] = useState<DailyOpsRow[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSessionRow[]>([]);
  const [cashSessionsTotal, setCashSessionsTotal] = useState(0);
  const [cashSessionPage, setCashSessionPage] = useState(0);
  const [cashSummary, setCashSummary] = useState<CashSummary>(null);
  const [vehicleType, setVehicleType] = useState<VehicleTypeRow[]>([]);
  const [paidTickets, setPaidTickets] = useState<PaidTicketRow[]>([]);
  const [paidTicketsTotal, setPaidTicketsTotal] = useState(0);
  const [paidTicketsPage, setPaidTicketsPage] = useState(0);
  const [voidedTickets, setVoidedTickets] = useState<VoidedTicketRow[]>([]);
  const [incomeExpense, setIncomeExpense] = useState<IncomeExpense | null>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);

  const loadReport = useCallback(async (report: ReportView, page = 0) => {
    setLoading(true);
    setError(null);
    try {
      switch (report) {
        case "daily-operations":
          setDailyOps(await fetchDailyOperations(dateFrom, dateTo));
          break;
        case "cash-session": {
          const result = await fetchCashSessionHistory(dateFrom, dateTo, page);
          setCashSessions(result.content);
          setCashSessionsTotal(result.totalElements);
          setCashSessionPage(result.number);
          if (result.content.length > 0) {
            try { setCashSummary(await fetchCashSessionSummary(result.content[0].id)); }
            catch { setCashSummary(null); }
          } else {
            setCashSummary(null);
          }
          break;
        }
        case "vehicle-type":
          setVehicleType(await fetchVehicleTypeReport());
          break;
        case "paid-tickets": {
          const result = await fetchPaidTickets(dateFrom, dateTo, page);
          setPaidTickets(result.content);
          setPaidTicketsTotal(result.totalElements);
          setPaidTicketsPage(result.number);
          break;
        }
        case "voided-tickets":
          setVoidedTickets(await fetchVoidedTickets(dateFrom, dateTo));
          break;
        case "income-expense":
          setIncomeExpense(await fetchIncomeExpense(dateFrom, dateTo));
          break;
        case "occupancy":
          setOccupancy(await fetchOccupancy());
          break;
        case "by-operator":
          setOperators(await fetchByOperator(dateFrom, dateTo));
          break;
        case "by-payment-method":
          setPaymentMethods(await fetchByPaymentMethod(dateFrom, dateTo));
          break;
      }
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.REPORT_ACTION));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const loadCashSessionSummary = useCallback(async (sessionId: string) => {
    try { setCashSummary(await fetchCashSessionSummary(sessionId)); }
    catch { setCashSummary(null); }
  }, []);

  const handleExport = useCallback((view: ReportView) => {
    const filename = `reporte-${view}-${todayStr()}.csv`;
    switch (view) {
      case "daily-operations":
        toCsv(
          ["Fecha", "Entradas", "Salidas", "Perdidos", "Efectivo", "Tarjeta", "Transferencia", "Otros", "Total"],
          dailyOps.map((r) => [r.date, String(r.entries), String(r.exits), String(r.lostTickets), r.cashTotal.toFixed(0), r.cardTotal.toFixed(0), r.transferTotal.toFixed(0), r.otherTotal.toFixed(0), r.grandTotal.toFixed(0)]),
          filename);
        break;
      case "cash-session":
        toCsv(
          ["ID", "Apertura", "Cierre", "Operador", "Estado", "Base", "Esperado", "Contado", "Diferencia", "Movs"],
          cashSessions.map((r) => [r.id, dateLabel(r.openedAt), r.closedAt ? dateLabel(r.closedAt) : "", r.operatorName ?? "", r.status, r.openingAmount.toFixed(0), r.expectedAmount.toFixed(0), r.countedAmount != null ? r.countedAmount.toFixed(0) : "", r.difference != null ? r.difference.toFixed(0) : "", String(r.movementCount)]),
          filename);
        break;
      case "vehicle-type":
        toCsv(
          ["Tipo", "Activos", "Entradas hoy", "Salidas hoy", "Recaudo hoy"],
          vehicleType.map((r) => [r.vehicleType, String(r.activeCount), String(r.entriesToday), String(r.exitsToday), r.revenueToday.toFixed(0)]),
          filename);
        break;
      case "paid-tickets":
        toCsv(
          ["Ticket", "Placa", "Tipo", "Monto", "Método", "Pagado", "Ingreso"],
          paidTickets.map((r) => [r.ticketNumber ?? "", r.plate ?? "", r.vehicleType ?? "", r.amount.toFixed(0), pmLabel(r.paymentMethod), dateLabel(r.paidAt), dateLabel(r.entryAt)]),
          filename);
        break;
      case "voided-tickets":
        toCsv(
          ["Tipo", "Método", "Monto", "Motivo", "Anulado por", "Anulado", "Creado"],
          voidedTickets.map((r) => [r.displayName, pmLabel(r.paymentMethod), r.amount.toFixed(0), r.voidReason ?? "", r.voidedByName ?? "", dateLabel(r.voidedAt), dateLabel(r.createdAt)]),
          filename);
        break;
      case "income-expense":
        if (!incomeExpense) return;
        toCsv(
          ["Tipo", "Movimiento", "Monto", "Cantidad"],
          incomeExpense.breakdown.map((r) => [r.amount >= 0 ? "Ingreso" : "Egreso", r.displayName, r.amount.toFixed(0), String(r.count)]),
          filename);
        break;
      case "occupancy":
        if (!occupancy) return;
        toCsv(
          ["Total", "Ocupados", "Disponibles", "% Ocupación"],
          [
            [String(occupancy.totalSpaces), String(occupancy.occupiedSpaces), String(occupancy.availableSpaces), occupancy.occupancyPercentage.toFixed(1)],
            ...occupancy.byVehicleType.map((vt) => [vt.vehicleType, String(vt.occupied), "", ""]),
          ],
          filename);
        break;
      case "by-operator":
        toCsv(
          ["Operador", "Transacciones", "Total", "Efectivo", "Tarjeta", "Transferencia", "Otros"],
          operators.map((r) => [r.operatorName, String(r.transactionCount), r.totalAmount.toFixed(0), r.cashAmount.toFixed(0), r.cardAmount.toFixed(0), r.transferAmount.toFixed(0), r.otherAmount.toFixed(0)]),
          filename);
        break;
      case "by-payment-method":
        toCsv(
          ["Método", "Transacciones", "Total", "%"],
          paymentMethods.map((r) => [r.displayName, String(r.transactionCount), r.totalAmount.toFixed(0), r.percentage.toFixed(1)]),
          filename);
        break;
    }
  }, [dailyOps, cashSessions, vehicleType, paidTickets, voidedTickets, incomeExpense, occupancy, operators, paymentMethods]);

  return {
    dateFrom, setDateFrom, dateTo, setDateTo,
    loading, error, setError,
    dailyOps,
    cashSessions, cashSessionsTotal, cashSessionPage,
    cashSummary, loadCashSessionSummary,
    vehicleType,
    paidTickets, paidTicketsTotal, paidTicketsPage,
    voidedTickets, incomeExpense, occupancy,
    operators, paymentMethods,
    loadReport, handleExport,
  };
}
