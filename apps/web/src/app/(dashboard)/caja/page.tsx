"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListBox } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import { useDialog } from "@/components/ui/DialogProvider";
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
  cashAudit,
  type CashAuditEntryDto,
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
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
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

function friendlyCashError(msg: string): string {
  if (msg.includes("No active cash session found")) {
    return "No hay una caja abierta en este terminal. Selecciona un terminal y presiona 'Abrir caja' para iniciar una sesión.";
  }
  if (msg.includes("already has an active cash session")) {
    return "Este terminal ya tiene una caja abierta. Ciérrala antes de abrir una nueva.";
  }
  return msg;
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
  const [openNotes, setOpenNotes] = useState("");
  const [auditLog, setAuditLog] = useState<CashAuditEntryDto[]>([]);
  const [closingWitness, setClosingWitness] = useState("");
  const [showShiftChangeModal, setShowShiftChangeModal] = useState(false);
  const [nextOpenAmount, setNextOpenAmount] = useState("0");
  const { confirm } = useDialog();

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
      try {
        const [mv, sm] = await Promise.all([cashMovements(s.id), cashSummary(s.id)]);
        setMovements(mv);
        setSummary(sm);
      } catch (e2) {
        const msg = e2 instanceof Error ? friendlyCashError(e2.message) : "Error al cargar movimientos/resumen";
        setError(msg);
      }
    } catch (e) {
      setSession(null);
      setMovements([]);
      setSummary(null);
      if (e instanceof Error && !e.message.includes("404") && !e.message.includes("409")) {
        const friendly = friendlyCashError(e.message);
        if (!friendly.includes("No hay")) {
          setError(friendly);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [site, terminal]);

  useEffect(() => {
    setTerminal(defaultTerminal());
  }, []);

  useEffect(() => {
    cashPolicy(site || defaultSite())
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, [site]);

  useEffect(() => {
    cashRegisters(site || defaultSite())
      .then(setRegisterRows)
      .catch(() => setRegisterRows([]));
  }, [site]);

  useEffect(() => {
    startLocalPrintQueueWorker();
    refreshOutbox().catch(console.error);
    flushCashMovementOutbox().then(() => { refreshOutbox().catch(console.error); }).catch(console.error);
  }, [refreshOutbox]);

  useEffect(() => {
    load().catch(console.error);
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
  const [canAudit, setCanAudit] = useState(false);

  useEffect(() => {
    (async () => {
      setCanOpen(await hasPermission("cierres_caja:abrir"));
      setCanClose(await hasPermission("cierres_caja:cerrar"));
      setCanMove(await hasPermission("cobros:registrar"));
      setCanVoid(await hasPermission("anulaciones:crear"));
      setCanAudit(
        (await hasPermission("reportes:leer")) || (await hasPermission("cierres_caja:cerrar"))
      );
    })().catch(console.error);
  }, []);

  useEffect(() => {
    if (!session?.id || !canAudit) {
      setAuditLog([]);
      return;
    }
    cashAudit(session.id)
      .then(setAuditLog)
      .catch(() => setAuditLog([]));
  }, [session?.id, canAudit]);

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
        openIdempotencyKey: `open:${term}:${Date.now()}`,
        notes: openNotes.trim() || null
      });
      setSession(s);
      setOpenNotes("");
      await load();
    } catch (e) {
      if (e instanceof Error && (e.message.includes("409") || e.message.includes("Conflict"))) {
        await load();
        return;
      }
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
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
      refreshOutbox().catch(console.error);
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
        refreshOutbox().catch(console.error);
      } else {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
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
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  };

  const onClose = async () => {
    if (!session) {
      return;
    }
    if (!session.countedAt) {
      setError("Debe realizar el arqueo (guardar conteo) antes de cerrar la caja.");
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
    if (outboxCount > 0) {
      setError("NO PUEDE CERRAR LA CAJA. Tiene movimientos locales (offline) pendientes de sincronización. Debe conectarse a internet para que se sincronicen antes de poder hacer el cierre ciego.");
      return;
    }
    if (!(await confirm("Confirma cierre de caja? No se podran agregar movimientos despues."))) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cashClose(session.id, {
        closingNotes: closeNotes || null,
        closingWitnessName: closingWitness.trim() || null,
        closeIdempotencyKey: `close:${session.id}:${Date.now()}`
      });
      setCloseNotes("");
      setClosingWitness("");
      await load();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
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
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.PRINT_ACTION));
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
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.PRINT_ACTION));
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
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.PRINT_ACTION));
    } finally {
      setBusy(false);
    }
  };

  const onShiftChange = async () => {
    if (!session) return;
    if (session.status === "OPEN" && !session.countedAt) {
      setError("Debe realizar el arqueo antes del cambio de turno.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cashClose(session.id, {
        closingNotes: "Cierre por cambio de turno.",
        closeIdempotencyKey: `shift-change-close:${session.id}:${Date.now()}`
      });
      setSession(null);
      setSummary(null);
      setMovements([]);
      setOpenAmount(nextOpenAmount);
      setError("Turno cerrado con éxito. Indique base para el nuevo turno.");
      await load();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
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
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
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
          <div className="mt-2 rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-900">
            <p className="font-bold uppercase text-red-800">¡Alerta de Sincronización!</p>
            <p className="mt-1">
              Tiene <strong>{outboxCount}</strong> movimiento(s) pendiente(s) de sincronizar en la cola local.
              <strong> No podrá cerrar la caja hasta que se restablezca la conexión a internet y se sincronicen todos los movimientos.</strong>
            </p>
          </div>
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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-end">
        <Input
          label="Sede"
          
          size="sm"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          isDisabled={closed}
        />
        <div className="flex flex-col gap-2">
          {registerRows.length > 0 && (
            <Select
              label="Terminal / caja"
              value={registerRows.some((r) => r.terminal === terminal) ? [terminal] : []}
              onChange={(keys) => setTerminal(Array.from(keys)[0] as string)}
              isDisabled={closed}
            >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

              {registerRows.map((r) => (
                <ListBox.Item key={r.terminal} textValue={r.terminal}>
                  {(r.label ?? r.terminal) + ` (${r.terminal})`}
                </ListBox.Item>
              ))}
            
        </ListBox>
      </Select.Popover>
    </Select>
          )}
          <Input
            placeholder="Terminal manual"
            label="Terminal manual"
            size="sm"
            value={terminal}
            onChange={(e) => setTerminal(e.target.value)}
            isDisabled={closed}
          />
        </div>
        <Button 
          variant="outline" 
          color="primary"
          className="font-semibold h-[48px]" 
          onPress={() => { load().catch(console.error); }} 
          isLoading={busy}
        >
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Estado actual</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Cargando...</p>
          ) : !session ? (
            <div className="mt-4 text-sm text-slate-600">
              <p>No hay una caja abierta en este terminal.</p>
              <p className="mt-2">Para operar caja: ingresa el monto inicial y presiona <strong>Abrir caja</strong>.</p>
              <p className="mt-1">Si la caja ya está abierta en otro terminal, selecciona el terminal correcto y presiona <strong>Actualizar</strong>.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  data-testid="cash-status"
                  label={session.status === "OPEN" ? "Caja abierta" : "Caja cerrada"}
                  tone={session.status === "OPEN" ? "success" : "neutral"}
                />
                <span className="text-slate-600">
                  {new Date(session.openedAt).toLocaleString()}
                  {session.operatorName ? (
                    <> — {session.operatorName}</>
                  ) : null}
                </span>
              </div>

              {session?.status === "OPEN" ? (
                <div className="flex items-center justify-between gap-1 pt-1">
                  {[
                    { label: "Abrir", done: true },
                    { label: "Movimientos", done: movements.length > 0 },
                    { label: "Arqueo", done: !!session.countedAt },
                    { label: "Cerrar", done: false },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center gap-1 flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                            step.done
                              ? "bg-emerald-500 text-white"
                              : !session.countedAt && i === 2
                                ? "bg-blue-500 text-white"
                                : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {step.done ? "\u2713" : String(i + 1)}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">{step.label}</span>
                      </div>
                      {i < 3 ? (
                        <div className={`h-[2px] flex-1 self-start mt-3 ${step.done ? "bg-emerald-300" : "bg-slate-200"}`} />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {summary && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      Base inicial
                      <Tooltip content="Monto en efectivo con el que se abrió la caja">
                        <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
                      </Tooltip>
                    </p>
                    <p className="text-lg font-semibold text-slate-900">${summary.openingAmount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      Esperado (Libro)
                      <Tooltip content="Total que debería haber según los movimientos registrados">
                        <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
                      </Tooltip>
                    </p>
                    <p className="text-lg font-semibold text-slate-900">${summary.expectedLedgerTotal.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${summary.countedTotal != null ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200 border-dashed"}`}>
                    <p className={`text-[10px] uppercase tracking-wider ${summary.countedTotal != null ? "text-blue-600" : "text-slate-400"}`}>
                      Contado
                      <Tooltip content="Efectivo físico contado al realizar el arqueo">
                        <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
                      </Tooltip>
                    </p>
                    {summary.countedTotal != null ? (
                      <p className="text-lg font-semibold text-blue-900">${summary.countedTotal.toLocaleString()}</p>
                    ) : (
                      <p className="text-lg font-semibold text-slate-400 italic">Pendiente</p>
                    )}
                  </div>
                  <div className={`rounded-xl p-3 border ${summary.countedTotal != null ? (summary.difference === 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100") : "bg-slate-50 border-slate-200 border-dashed"}`}>
                    <p className={`text-[10px] uppercase tracking-wider ${summary.countedTotal != null ? "text-slate-500" : "text-slate-400"}`}>
                      Diferencia
                      <Tooltip content={summary.countedTotal != null ? `Contado − Esperado = ${summary.countedTotal.toLocaleString()} − ${summary.expectedLedgerTotal.toLocaleString()}` : "Realiza el arqueo para ver la diferencia"}>
                        <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-[8px] text-white cursor-help">?</span>
                      </Tooltip>
                    </p>
                    {summary.countedTotal != null ? (
                      <p className={`text-lg font-semibold ${summary.difference === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                        ${(summary.difference ?? 0).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-lg font-semibold text-slate-400 italic">Pendiente</p>
                    )}
                  </div>
                </div>
              )}

              {summary && (
                <div className="space-y-1 pt-2">
                  <p className="font-semibold text-slate-800 text-xs uppercase tracking-tight">Ventas por medio de pago</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.totalsByPaymentMethod).map(([method, amount]) => (
                      <Badge 
                        key={method} 
                        label={`${method}: $${amount.toLocaleString()}`} 
                        tone={method === "CASH" ? "success" : method === "TRANSFER" ? "warning" : "neutral"}
                      />
                    ))}
                  </div>
                </div>
              )}

              {summary && (
                <div className="space-y-1 pt-2">
                  <p className="font-semibold text-slate-800 text-xs uppercase tracking-tight">Resumen por tipo</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.totalsByMovementType).map(([type, amount]) => (
                      <Badge 
                        key={type} 
                        label={`${type.replace(/_/g, " ")}: $${amount.toLocaleString()}`} 
                        tone={amount < 0 ? "warning" : "neutral"}
                      />
                    ))}
                  </div>
                </div>
              )}

              {session.notes ? (
                <p className="mt-2 rounded-lg bg-amber-50/50 px-3 py-2 text-slate-800 italic">
                  &quot;{session.notes}&quot;
                </p>
              ) : null}

              {auditLog.length > 0 && canAudit ? (
                <div className="mt-4 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-800">Pista de auditoría (resumen)</p>
                  <ul className="mt-2 space-y-1">
                    {auditLog.slice(0, 40).map((a) => (
                      <li key={a.id} className="border-b border-slate-100 pb-1">
                        <span className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>{" "}
                        <strong>{a.action}</strong>
                        {a.actorName ? ` · ${a.actorName}` : ""}
                        {a.terminalId ? ` · terminal ${a.terminalId}` : ""}
                        {a.reason ? ` — ${a.reason}` : ""}
                      </li>
                    ))}
                  </ul>
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
              aria-label="Monto inicial"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={openAmount}
              onChange={(e) => setOpenAmount(e.target.value)}
              disabled={busy || !!session}
            />
          </label>
          <div className="mt-4">
            <Button
              className="w-full font-bold"
              color="primary"
              size="lg"
              isDisabled={busy || !!session || !canOpen}
              isLoading={busy}
              onPress={() => { onOpen().catch(console.error); }}
            >
              Abrir caja
            </Button>
          </div>
        </div>
      </div>

      {session?.status === "OPEN" ? (
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Movimientos</h2>
          <div className="mt-4 flex flex-wrap gap-4 mb-6">
            <Select
              label="Filtrar por tipo"
              className="max-w-[200px]"
              value={filterType ? [filterType] : [""]}
              onChange={(keys) => setFilterType(Array.from(keys)[0] as string)}
            >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

              <ListBox.Item key="">Todos los tipos</ListBox.Item>
              <ListBox.Item key="PARKING_PAYMENT">Cobro parqueo</ListBox.Item>
              <ListBox.Item key="MANUAL_INCOME">Ingreso manual</ListBox.Item>
              <ListBox.Item key="MANUAL_EXPENSE">Egreso manual</ListBox.Item>
              <ListBox.Item key="WITHDRAWAL">Retiro / Transferencia a Tesorería</ListBox.Item>
              <ListBox.Item key="CUSTOMER_REFUND">Devolucion al cliente</ListBox.Item>
              <ListBox.Item key="DISCOUNT">Descuento</ListBox.Item>
              <ListBox.Item key="ADJUSTMENT">Ajuste</ListBox.Item>
              <ListBox.Item key="LOST_TICKET_PAYMENT">Cobro ticket perdido</ListBox.Item>
              <ListBox.Item key="REPRINT_FEE">Reimpresion cobrada</ListBox.Item>
              <ListBox.Item key="VOID_OFFSET">Contrapartida anulacion</ListBox.Item>
            
        </ListBox>
      </Select.Popover>
    </Select>
            <Select
              label="Filtrar por medio"
              className="max-w-[200px]"
              value={filterMethod ? [filterMethod] : [""]}
              onChange={(keys) => setFilterMethod(Array.from(keys)[0] as string)}
            >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

              <ListBox.Item key="">Todos los medios</ListBox.Item>
              <ListBox.Item key="CASH">Efectivo</ListBox.Item>
              <ListBox.Item key="DEBIT_CARD">Tarjeta débito</ListBox.Item>
              <ListBox.Item key="CREDIT_CARD">Tarjeta crédito</ListBox.Item>
              <ListBox.Item key="CARD">Tarjeta legacy</ListBox.Item>
              <ListBox.Item key="QR">QR</ListBox.Item>
              <ListBox.Item key="NEQUI">Nequi</ListBox.Item>
              <ListBox.Item key="DAVIPLATA">Daviplata</ListBox.Item>
              <ListBox.Item key="TRANSFER">Transferencia</ListBox.Item>
              <ListBox.Item key="AGREEMENT">Convenio</ListBox.Item>
              <ListBox.Item key="INTERNAL_CREDIT">Crédito interno</ListBox.Item>
              <ListBox.Item key="OTHER">Otro</ListBox.Item>
              <ListBox.Item key="MIXED">Mixto</ListBox.Item>
            
        </ListBox>
      </Select.Popover>
    </Select>
          </div>
          
          <DataTable<CashMovementDto>
            columns={[
              { 
                key: "createdAt", 
                label: "Fecha",
                render: (m) => new Date(m.createdAt).toLocaleString()
              },
              { key: "movementType", label: "Tipo" },
              { key: "paymentMethod", label: "Medio" },
              { key: "amount", label: "Valor", align: "right" },
              {
                key: "registrar",
                label: "Registra",
                render: (m) => m.createdByName ?? m.createdById?.slice(0, 8)
              },
              {
                key: "terminal",
                label: "Equipo",
                render: (m) => m.terminal ?? "—"
              },
              { key: "status", label: "Estado" },
              {
                key: "actions",
                label: "Acciones",
                render: (m) => (
                  m.status === "POSTED" && m.movementType !== "VOID_OFFSET" && canVoid ? (
                    <Button
                      size="sm"
                      variant="tertiary"
                      color="danger"
                      onPress={() => setVoidTarget(m.id)}
                    >
                      Anular
                    </Button>
                  ) : null
                )
              }
            ]}
            rows={filteredMovements}
          />
          {filteredMovements.length === 0 && session?.status === "OPEN" ? (
            <p className="mt-3 text-xs text-slate-500 text-center">
              No hay movimientos registrados en esta sesión. Los cobros de salida y movimientos manuales aparecerán aquí.
            </p>
          ) : null}

          <h3 className="mt-8 text-base font-semibold text-slate-900">Ingreso / egreso manual</h3>
          <div className="mt-3 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-end">
            <Select
              label="Tipo de movimiento"
              value={[manualType]}
              onChange={(keys) => setManualType(Array.from(keys)[0] as string)}
              isDisabled={!canMove}
            >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

              <ListBox.Item key="MANUAL_INCOME">Ingreso manual</ListBox.Item>
              <ListBox.Item key="MANUAL_EXPENSE">Egreso manual</ListBox.Item>
              <ListBox.Item key="WITHDRAWAL">Retiro / Transferencia a Tesorería</ListBox.Item>
              <ListBox.Item key="CUSTOMER_REFUND">Devolucion al cliente</ListBox.Item>
              <ListBox.Item key="DISCOUNT">Descuento</ListBox.Item>
              <ListBox.Item key="ADJUSTMENT">Ajuste autorizado</ListBox.Item>
              <ListBox.Item key="REPRINT_FEE">Reimpresion cobrada</ListBox.Item>
            
        </ListBox>
      </Select.Popover>
    </Select>
            <Select
              label="Medio de pago"
              value={[manualMethod]}
              onChange={(keys) => setManualMethod(Array.from(keys)[0] as string)}
              isDisabled={!canMove}
            >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

              <ListBox.Item key="CASH">Efectivo</ListBox.Item>
              <ListBox.Item key="DEBIT_CARD">Tarjeta débito</ListBox.Item>
              <ListBox.Item key="CREDIT_CARD">Tarjeta crédito</ListBox.Item>
              <ListBox.Item key="CARD">Tarjeta legacy</ListBox.Item>
              <ListBox.Item key="QR">QR</ListBox.Item>
              <ListBox.Item key="NEQUI">Nequi</ListBox.Item>
              <ListBox.Item key="DAVIPLATA">Daviplata</ListBox.Item>
              <ListBox.Item key="TRANSFER">Transferencia</ListBox.Item>
              <ListBox.Item key="AGREEMENT">Convenio</ListBox.Item>
              <ListBox.Item key="INTERNAL_CREDIT">Crédito interno</ListBox.Item>
              <ListBox.Item key="OTHER">Otro</ListBox.Item>
              <ListBox.Item key="MIXED">Mixto</ListBox.Item>
            
        </ListBox>
      </Select.Popover>
    </Select>
            <Input
              label="Valor"
              
              size="sm"
              type="number"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              isDisabled={!canMove}
            />
            <Input
              label="Motivo"
              
              size="sm"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              isDisabled={!canMove}
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 font-bold"
              color="primary"
              variant="tertiary"
              isDisabled={busy || !canMove}
              isLoading={busy}
              onPress={() => { onAddManual().catch(console.error); }}
            >
              Registrar movimiento
            </Button>
            <Button
              className="flex-1 font-semibold"
              variant="outline"
              color="primary"
              isDisabled={busy || movements.length === 0}
              onPress={() => { onPrintLastMovement().catch(console.error); }}
            >
              Imprimir ultimo movimiento
            </Button>
          </div>
        </div>
      ) : null}

      {session?.status === "OPEN" && canClose ? (
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Arqueo</h2>
          <p className="mt-2 text-sm text-slate-600">
            Si hay diferencia respecto al esperado, las observaciones son obligatorias.
          </p>
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Efectivo contado"
              
              size="sm"
              type="number"
              value={countCash}
              onChange={(e) => setCountCash(e.target.value)}
            />
            <Input
              label="Tarjetas"
              
              size="sm"
              type="number"
              value={countCard}
              onChange={(e) => setCountCard(e.target.value)}
            />
            <Input
              label="Transferencias"
              
              size="sm"
              type="number"
              value={countTransfer}
              onChange={(e) => setCountTransfer(e.target.value)}
            />
            <Input
              label="Otros"
              
              size="sm"
              type="number"
              value={countOther}
              onChange={(e) => setCountOther(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <TextArea
              label="Observaciones de arqueo"
              placeholder="Describa cualquier novedad..."
              
              value={countNotes}
              onChange={(e) => setCountNotes(e.target.value)}
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button 
              className="flex-1 font-bold" 
              color="primary" 
              variant="tertiary"
              isDisabled={busy} 
              isLoading={busy}
              onPress={() => { onCount().catch(console.error); }}
            >
              Guardar arqueo
            </Button>
            <Button
              className="flex-1 font-semibold"
              variant="outline"
              color="primary"
              isDisabled={busy || !session.countedAt}
              onPress={() => { onPrintCount().catch(console.error); }}
            >
              Imprimir comprobante de arqueo
            </Button>
          </div>

          <h3 className="mt-10 text-base font-semibold text-slate-900">Cierre</h3>
          <p className="mt-2 text-xs text-slate-500">
            El usuario que ejecuta el cierre queda registrado en el sistema. Opcionalmente indique nombre
            para constancia física de testigo o supervisor.
          </p>
          <div className="mt-4">
            <TextArea
              label="Notas de cierre"
              placeholder="Obligatorias si hay diferencia..."
              
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Input
              label="Testigo / responsable firma (opcional)"
              placeholder="Nombre legible..."
              
              value={closingWitness}
              onChange={(e) => setClosingWitness(e.target.value)}
            />
          </div>
          {session && !session.countedAt ? (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              ⚠ Debe realizar el arqueo (ingresar valores de conteo y guardar) antes de poder cerrar la caja.
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button 
              color="danger" 
              variant="tertiary" 
              className="flex-1 font-bold"
              isDisabled={busy || !session?.countedAt} 
              isLoading={busy}
              onPress={() => { onClose().catch(console.error); }}
            >
              Cerrar caja (Fin turno)
            </Button>
            <Button
              color="primary"
              variant="tertiary"
              className="flex-1 font-bold"
              isDisabled={busy || !session.countedAt}
              onPress={() => setShowShiftChangeModal(true)}
            >
              Cambio de turno
            </Button>
          </div>
        </div>
      ) : null}

      {closed && session ? (
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Caja cerrada</h2>
          <p className="mt-2 text-sm text-slate-600">Imprima el comprobante de cierre para archivo.</p>
          <div className="mt-6 w-full sm:max-w-md">
            <Button 
              className="w-full font-bold" 
              color="primary" 
              isDisabled={busy} 
              isLoading={busy}
              onPress={() => { onPrintClosing().catch(console.error); }}
            >
              Imprimir cierre
            </Button>
          </div>
        </div>
      ) : null}

      <Modal state={ { isOpen: showShiftChangeModal, setOpen: (v: boolean) => { if(!v) setShowShiftChangeModal(false); }, open: () => {}, close: () => setShowShiftChangeModal(false), toggle: () => {} } }>
        <Modal.Content>
          <Modal.Header>Cambio de turno</Modal.Header>
          <Modal.Body>
            <p className="text-sm text-slate-600 mb-4">
              Se cerrará la caja actual y se dejará lista para la apertura del siguiente operador.
            </p>
            <Input
              label="Monto base para siguiente turno"
              
              type="number"
              value={nextOpenAmount}
              onChange={(e) => setNextOpenAmount(e.target.value)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={() => setShowShiftChangeModal(false)}>
              Cancelar
            </Button>
            <Button color="primary" isLoading={busy} onPress={() => { onShiftChange().catch(console.error); }}>
              Confirmar Cambio
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      <Modal state={ { isOpen: !!voidTarget, setOpen: (v: boolean) => { if(!v) setVoidTarget(null); }, open: () => {}, close: () => setVoidTarget(null), toggle: () => {} } }>
        <Modal.Content>
          <Modal.Header>Anular movimiento</Modal.Header>
          <Modal.Body>
            <p className="text-sm text-slate-600 mb-2">Motivo obligatorio (auditoria).</p>
            <TextArea
              label="Motivo"
              placeholder="Describa la razón de la anulación..."
              
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" color="primary" onPress={() => setVoidTarget(null)}>
              Cancelar
            </Button>
            <Button color="danger" isLoading={busy} onPress={() => { onVoid().catch(console.error); }}>
              Confirmar anulacion
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </div>
  );
}
