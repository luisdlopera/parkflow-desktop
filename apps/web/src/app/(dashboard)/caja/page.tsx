"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  cashAddMovement,
  cashClose,
  cashCount,
  cashCurrent,
  cashMovements,
  cashOpen,
  cashPolicy,
  cashPrintClosing,
  cashRegisters,
  cashSummary,
  cashVoidMovement,
  type CashMovementDto,
  type CashPolicyDto,
  type CashRegisterRow,
  type CashSessionDto,
  type CashSummaryDto
} from "@/lib/cash/cash-api";
import { buildCashCountTicket, buildCashMovementTicket } from "@/lib/cash/cash-print";
import { listCashOutboxPending } from "@/lib/cash/cash-outbox-idb";
import { flushCashMovementOutbox } from "@/lib/cash/cash-sync";
import { currentUser, hasPermission } from "@/lib/auth";
import { printCashThermalReceipt } from "@/lib/print/print-service";
import { startLocalPrintQueueWorker } from "@/lib/print/print-service";
import type { TicketDocument } from "@parkflow/types";

function defaultSite(): string {
  return (process.env.NEXT_PUBLIC_PARKING_SITE ?? "default").trim() || "default";
}

function defaultTerminal(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() ||
    window.localStorage.getItem("parkflow_terminal_id")?.trim() ||
    ""
  );
}

function closingDocToTicket(doc: Record<string, unknown>): TicketDocument {
  const lines = doc.detailLines;
  return {
    ticketId: String(doc.ticketId ?? ""),
    templateVersion: "ticket-layout-v1",
    paperWidthMm: doc.paperWidthMm === 80 ? 80 : 58,
    ticketNumber: String(doc.ticketNumber ?? ""),
    parkingName: String(doc.parkingName ?? "Parkflow"),
    plate: String(doc.plate ?? "CAJA"),
    vehicleType: "OTHER",
    site: doc.site != null ? String(doc.site) : null,
    lane: doc.lane != null ? String(doc.lane) : null,
    booth: doc.booth != null ? String(doc.booth) : null,
    terminal: doc.terminal != null ? String(doc.terminal) : null,
    operatorName: doc.operatorName != null ? String(doc.operatorName) : null,
    issuedAtIso: String(doc.issuedAtIso ?? new Date().toISOString()),
    legalMessage: doc.legalMessage != null ? String(doc.legalMessage) : null,
    qrPayload: doc.qrPayload != null ? String(doc.qrPayload) : null,
    barcodePayload: doc.barcodePayload != null ? String(doc.barcodePayload) : null,
    copyNumber: typeof doc.copyNumber === "number" ? doc.copyNumber : 1,
    printerProfile: null,
    detailLines: Array.isArray(lines) ? (lines as string[]) : null
  };
}

export default function CajaPage() {
  const [session, setSession] = useState<CashSessionDto | null>(null);
  const [movements, setMovements] = useState<CashMovementDto[]>([]);
  const [summary, setSummary] = useState<CashSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [site, setSite] = useState(defaultSite);
  const [terminal, setTerminal] = useState("");
  const [openAmount, setOpenAmount] = useState("0");
  const [filterType, setFilterType] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [manualType, setManualType] = useState("MANUAL_INCOME");
  const [manualMethod, setManualMethod] = useState("CASH");
  const [manualAmount, setManualAmount] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [countCash, setCountCash] = useState("");
  const [countCard, setCountCard] = useState("");
  const [countTransfer, setCountTransfer] = useState("");
  const [countOther, setCountOther] = useState("");
  const [countNotes, setCountNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [policy, setPolicy] = useState<CashPolicyDto | null>(null);
  const [registerRows, setRegisterRows] = useState<CashRegisterRow[]>([]);

  // PERFORMANCE: Constant value, no need for useMemo
  const parkingName = process.env.NEXT_PUBLIC_PARKING_NAME ?? "Parkflow";

  const refreshOutbox = useCallback(async () => {
    const rows = await listCashOutboxPending();
    setOutboxCount(rows.length);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const term = terminal || defaultTerminal();
    if (!term) {
      setError("Configure NEXT_PUBLIC_TERMINAL_ID o parkflow_terminal_id para operar caja.");
      setSession(null);
      setMovements([]);
      setSummary(null);
      setLoading(false);
      return;
    }
    try {
      const s = await cashCurrent(site || defaultSite(), term);
      setSession(s);
      const [mv, sm] = await Promise.all([cashMovements(s.id), cashSummary(s.id)]);
      setMovements(mv);
      setSummary(sm);
    } catch (e) {
      setSession(null);
      setMovements([]);
      setSummary(null);
      if (e instanceof Error && !e.message.includes("404") && !e.message.includes("No hay")) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [site, terminal]);

  useEffect(() => {
    setTerminal(defaultTerminal());
  }, []);

  useEffect(() => {
    void cashPolicy(site || defaultSite())
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, [site]);

  useEffect(() => {
    void cashRegisters(site || defaultSite())
      .then(setRegisterRows)
      .catch(() => setRegisterRows([]));
  }, [site]);

  useEffect(() => {
    startLocalPrintQueueWorker();
    void refreshOutbox();
    void flushCashMovementOutbox().then(() => void refreshOutbox());
  }, [refreshOutbox]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (filterType && m.movementType !== filterType) {
        return false;
      }
      if (filterMethod && m.paymentMethod !== filterMethod) {
        return false;
      }
      return true;
    });
  }, [movements, filterType, filterMethod]);

  const [canOpen, setCanOpen] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const [canVoid, setCanVoid] = useState(false);

  useEffect(() => {
    void (async () => {
      setCanOpen(await hasPermission("cierres_caja:abrir"));
      setCanClose(await hasPermission("cierres_caja:cerrar"));
      setCanMove(await hasPermission("cobros:registrar"));
      setCanVoid(await hasPermission("anulaciones:crear"));
    })();
  }, []);

  const onOpen = async () => {
    const u = await currentUser();
    if (!u) {
      setError("Sesion requerida");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const term = terminal || defaultTerminal();
      if (!term) {
        throw new Error("Terminal obligatorio");
      }
      const s = await cashOpen({
        site: site || defaultSite(),
        terminal: term,
        openingAmount: Number(openAmount.replace(",", ".")) || 0,
        operatorUserId: u.id,
        openIdempotencyKey: `open:${term}:${Date.now()}`
      });
      setSession(s);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al abrir");
    } finally {
      setBusy(false);
    }
  };

  const onAddManual = async () => {
    if (!session || session.status !== "OPEN") {
      return;
    }
    const amt = Number(manualAmount.replace(",", ".")) || 0;
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine &&
      policy &&
      amt > policy.offlineMaxManualMovement
    ) {
      setError(
        `Sin conexion: el tope para movimientos manuales offline es ${policy.offlineMaxManualMovement.toLocaleString("es-CO")} (parametros sede o servidor).`
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      await cashAddMovement(
        session.id,
        {
          type: manualType,
          paymentMethod: manualMethod,
          amount: amt,
          reason: manualReason || null,
          idempotencyKey: `mov:${session.id}:${Date.now()}`
        },
        { offline }
      );
      setManualAmount("");
      setManualReason("");
      await load();
      void refreshOutbox();
    } catch (e) {
      if (!navigator.onLine) {
        const { enqueueCashMovementOffline } = await import("@/lib/cash/cash-outbox-idb");
        await enqueueCashMovementOffline(session.id, {
          type: manualType,
          paymentMethod: manualMethod,
          amount: Number(manualAmount.replace(",", ".")) || 0,
          reason: manualReason,
          idempotencyKey: `offline:${session.id}:${Date.now()}`
        });
        setError("Sin conexion: movimiento guardado en cola local para sincronizar.");
        void refreshOutbox();
      } else {
        setError(e instanceof Error ? e.message : "Error al registrar");
      }
    } finally {
      setBusy(false);
    }
  };

  const onCount = async () => {
    if (!session) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cashCount(session.id, {
        countCash: Number(countCash.replace(",", ".")) || 0,
        countCard: Number(countCard.replace(",", ".")) || 0,
        countTransfer: Number(countTransfer.replace(",", ".")) || 0,
        countOther: Number(countOther.replace(",", ".")) || 0,
        observations: countNotes || null
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en arqueo");
    } finally {
      setBusy(false);
    }
  };

  const onClose = async () => {
    if (!session) {
      return;
    }
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine &&
      policy &&
      !policy.offlineCloseAllowed
    ) {
      setError(
        "Sin conexion: el cierre definitivo no esta permitido offline con la politica actual. Conecte o habilite cashOfflineCloseAllowed en parametros de sede."
      );
      return;
    }
    if (!confirm("Confirma cierre de caja? No se podran agregar movimientos despues.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cashClose(session.id, {
        closingNotes: closeNotes || null,
        closeIdempotencyKey: `close:${session.id}:${Date.now()}`
      });
      setCloseNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cerrar");
    } finally {
      setBusy(false);
    }
  };

  const onPrintClosing = async () => {
    if (!session) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const p = await cashPrintClosing(session.id);
      const ticket = closingDocToTicket(p.ticketDocument);
      await printCashThermalReceipt(ticket, "CASH_CLOSING");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al imprimir");
    } finally {
      setBusy(false);
    }
  };

  const onPrintLastMovement = async () => {
    if (!session || movements.length === 0) {
      setError("No hay movimientos para imprimir");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ticket = buildCashMovementTicket(session, movements[0], parkingName);
      await printCashThermalReceipt(ticket, "CASH_MOVEMENT");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al imprimir movimiento");
    } finally {
      setBusy(false);
    }
  };

  const onPrintCount = async () => {
    if (!session || !summary) {
      setError("Guarde arqueo antes de imprimir");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await printCashThermalReceipt(buildCashCountTicket(session, summary, parkingName), "CASH_COUNT");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al imprimir arqueo");
    } finally {
      setBusy(false);
    }
  };

  const onVoid = async () => {
    if (!session || !voidTarget || !voidReason.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cashVoidMovement(session.id, voidTarget, voidReason.trim(), `void:${voidTarget}`);
      setVoidTarget(null);
      setVoidReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al anular");
    } finally {
      setBusy(false);
    }
  };

  const closed = session?.status === "CLOSED";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Caja</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Cierre de caja</h1>
        {outboxCount > 0 ? (
          <p className="mt-2 text-sm text-amber-800">
            {outboxCount} movimiento(s) pendiente(s) de sincronizar (cola local).
          </p>
        ) : null}
        {policy ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800">Politica efectiva ({policy.resolvedForSite})</p>
            <p className="mt-1">{policy.operationsHint}</p>
            <p className="mt-1">
              Cobro exige caja abierta: <strong>{policy.requireOpenForPayment ? "Si" : "No"}</strong> — Cierre
              offline permitido: <strong>{policy.offlineCloseAllowed ? "Si" : "No"}</strong> — Tope manual
              offline: <strong>{policy.offlineMaxManualMovement.toLocaleString("es-CO")}</strong>
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <label className="surface flex flex-col gap-1 rounded-2xl p-4">
          <span className="text-xs font-medium text-slate-500">Sede</span>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            disabled={closed}
          />
        </label>
        <label className="surface flex flex-col gap-1 rounded-2xl p-4">
          <span className="text-xs font-medium text-slate-500">Terminal / caja</span>
          {registerRows.length > 0 ? (
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={registerRows.some((r) => r.terminal === terminal) ? terminal : ""}
              onChange={(e) => setTerminal(e.target.value)}
              disabled={closed}
            >
              <option value="">Seleccione registro...</option>
              {registerRows.map((r) => (
                <option key={r.id} value={r.terminal}>
                  {(r.label ?? r.terminal) + ` (${r.terminal})`}
                </option>
              ))}
            </select>
          ) : null}
          <input
            className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="O escriba terminal manual"
            value={terminal}
            onChange={(e) => setTerminal(e.target.value)}
            disabled={closed}
          />
        </label>
        <div className="surface flex items-end rounded-2xl p-4">
          <Button label="Actualizar" tone="ghost" onClick={() => void load()} disabled={busy} />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Estado actual</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Cargando...</p>
          ) : !session ? (
            <p className="mt-4 text-sm text-slate-600">No hay caja abierta en este terminal.</p>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  data-testid="cash-status"
                  label={session.status === "OPEN" ? "Caja abierta" : "Caja cerrada"}
                  tone={session.status === "OPEN" ? "success" : "neutral"}
                />
                <span className="text-slate-600">
                  {new Date(session.openedAt).toLocaleString()} — Base: {session.openingAmount}
                </span>
              </div>
              {summary ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-slate-700">
                  <p>Esperado (libro): {summary.expectedLedgerTotal}</p>
                  {summary.countedTotal != null ? <p>Contado: {summary.countedTotal}</p> : null}
                  {summary.difference != null ? <p>Diferencia: {summary.difference}</p> : null}
                  <p className="text-xs text-slate-500">Movimientos: {summary.movementCount}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Abrir caja</h2>
          <p className="mt-2 text-sm text-slate-600">Requiere permiso de apertura y terminal configurado.</p>
          <label className="mt-4 block text-sm">
            <span className="text-slate-600">Monto inicial</span>
            <input
              data-testid="initial-amount"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={openAmount}
              onChange={(e) => setOpenAmount(e.target.value)}
              disabled={busy || !!session}
            />
          </label>
          <div className="mt-4">
            <Button
              data-testid="open-cash"
              label={busy ? "Procesando..." : "Abrir caja"}
              tone="primary"
              disabled={busy || !!session || !canOpen}
              onClick={() => void onOpen()}
            />
          </div>
        </div>
      </div>

      {session?.status === "OPEN" ? (
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Movimientos</h2>
          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="PARKING_PAYMENT">Cobro parqueo</option>
              <option value="MANUAL_INCOME">Ingreso manual</option>
              <option value="MANUAL_EXPENSE">Egreso</option>
              <option value="DISCOUNT">Descuento</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="VOID_OFFSET">Contrapartida anulacion</option>
            </select>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="">Todos los medios</option>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="OTHER">Otro</option>
              <option value="MIXED">Mixto</option>
            </select>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Medio</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Sin movimientos con este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{m.movementType}</td>
                      <td className="py-2 pr-3">{m.paymentMethod}</td>
                      <td className="py-2 pr-3">{m.amount}</td>
                      <td className="py-2 pr-3">{m.status}</td>
                      <td className="py-2">
                        {m.status === "POSTED" &&
                        m.movementType !== "VOID_OFFSET" &&
                        canVoid ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700 hover:underline"
                            onClick={() => setVoidTarget(m.id)}
                          >
                            Anular
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 text-base font-semibold text-slate-900">Ingreso / egreso manual</h3>
          <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={manualType}
              onChange={(e) => setManualType(e.target.value)}
              disabled={!canMove}
            >
              <option value="MANUAL_INCOME">Ingreso manual</option>
              <option value="MANUAL_EXPENSE">Egreso manual</option>
              <option value="DISCOUNT">Descuento</option>
              <option value="ADJUSTMENT">Ajuste autorizado</option>
              <option value="REPRINT_FEE">Reimpresion cobrada</option>
            </select>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={manualMethod}
              onChange={(e) => setManualMethod(e.target.value)}
              disabled={!canMove}
            >
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="OTHER">Otro</option>
              <option value="MIXED">Mixto</option>
            </select>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Valor"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              disabled={!canMove}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Motivo"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              disabled={!canMove}
            />
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 sm:min-w-[200px] flex-1">
              <Button
                label="Registrar movimiento"
                tone="primary"
                disabled={busy || !canMove}
                onClick={() => void onAddManual()}
              />
            </div>
            <div className="min-w-0 sm:min-w-[200px] flex-1">
              <Button
                label="Imprimir ultimo movimiento"
                tone="ghost"
                disabled={busy || movements.length === 0}
                onClick={() => void onPrintLastMovement()}
              />
            </div>
          </div>
        </div>
      ) : null}

      {session?.status === "OPEN" && canClose ? (
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Arqueo</h2>
          <p className="mt-2 text-sm text-slate-600">
            Si hay diferencia respecto al esperado, las observaciones son obligatorias.
          </p>
          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Efectivo contado"
              value={countCash}
              onChange={(e) => setCountCash(e.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Tarjetas"
              value={countCard}
              onChange={(e) => setCountCard(e.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Transferencias"
              value={countTransfer}
              onChange={(e) => setCountTransfer(e.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Otros"
              value={countOther}
              onChange={(e) => setCountOther(e.target.value)}
            />
          </div>
          <label className="mt-3 block text-sm">
            <span className="text-slate-600">Observaciones de arqueo</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              rows={2}
              value={countNotes}
              onChange={(e) => setCountNotes(e.target.value)}
            />
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 sm:min-w-[200px] flex-1">
              <Button label="Guardar arqueo" tone="primary" disabled={busy} onClick={() => void onCount()} />
            </div>
            <div className="min-w-0 sm:min-w-[200px] flex-1">
              <Button
                label="Imprimir comprobante de arqueo"
                tone="ghost"
                disabled={busy || !session.countedAt}
                onClick={() => void onPrintCount()}
              />
            </div>
          </div>

          <h3 className="mt-10 text-base font-semibold text-slate-900">Cierre</h3>
          <label className="mt-3 block text-sm">
            <span className="text-slate-600">Notas de cierre (obligatorias si hay diferencia)</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              rows={2}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
            />
          </label>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 sm:min-w-[200px] flex-1 sm:flex-initial">
              <Button data-testid="confirm-close" label="Cerrar caja" tone="ghost" disabled={busy} onClick={() => void onClose()} />
            </div>
          </div>
        </div>
      ) : null}

      {closed && session ? (
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Caja cerrada</h2>
          <p className="mt-2 text-sm text-slate-600">Imprima el comprobante de cierre para archivo.</p>
          <div className="mt-4 w-full sm:max-w-md">
            <Button label="Imprimir cierre" tone="primary" disabled={busy} onClick={() => void onPrintClosing()} />
          </div>
        </div>
      ) : null}

      {voidTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Anular movimiento</h3>
            <p className="mt-2 text-sm text-slate-600">Motivo obligatorio (auditoria).</p>
            <textarea
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button label="Cancelar" tone="ghost" onClick={() => setVoidTarget(null)} />
              <Button label="Confirmar anulacion" tone="primary" disabled={busy} onClick={() => void onVoid()} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
