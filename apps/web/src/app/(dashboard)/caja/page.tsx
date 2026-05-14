"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Input,
  Select,
  SelectItem,
  Textarea,
  Button,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
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
  const [openNotes, setOpenNotes] = useState("");
  const [auditLog, setAuditLog] = useState<CashAuditEntryDto[]>([]);
  const [closingWitness, setClosingWitness] = useState("");
  const [showShiftChangeModal, setShowShiftChangeModal] = useState(false);
  const [nextOpenAmount, setNextOpenAmount] = useState("0");

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
  const [canAudit, setCanAudit] = useState(false);

  useEffect(() => {
    void (async () => {
      setCanOpen(await hasPermission("cierres_caja:abrir"));
      setCanClose(await hasPermission("cierres_caja:cerrar"));
      setCanMove(await hasPermission("cobros:registrar"));
      setCanVoid(await hasPermission("anulaciones:crear"));
      setCanAudit(
        (await hasPermission("reportes:leer")) || (await hasPermission("cierres_caja:cerrar"))
      );
    })();
  }, []);

  useEffect(() => {
    if (!session?.id || !canAudit) {
      setAuditLog([]);
      return;
    }
    void cashAudit(session.id)
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
        closingWitnessName: closingWitness.trim() || null,
        closeIdempotencyKey: `close:${session.id}:${Date.now()}`
      });
      setCloseNotes("");
      setClosingWitness("");
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
      setError(e instanceof Error ? e.message : "Error en cambio de turno");
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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-end">
        <Input
          label="Sede"
          variant="flat"
          size="sm"
          value={site}
          onValueChange={setSite}
          isDisabled={closed}
        />
        <div className="flex flex-col gap-2">
          {registerRows.length > 0 && (
            <Select
              label="Terminal / caja"
              variant="flat"
              size="sm"
              selectedKeys={registerRows.some((r) => r.terminal === terminal) ? [terminal] : []}
              onSelectionChange={(keys) => setTerminal(Array.from(keys)[0] as string)}
              isDisabled={closed}
            >
              {registerRows.map((r) => (
                <SelectItem key={r.terminal} textValue={r.terminal}>
                  {(r.label ?? r.terminal) + ` (${r.terminal})`}
                </SelectItem>
              ))}
            </Select>
          )}
          <Input
            placeholder="Terminal manual"
            variant="flat"
            size="sm"
            value={terminal}
            onValueChange={setTerminal}
            isDisabled={closed}
          />
        </div>
        <Button 
          variant="bordered" 
          color="primary"
          className="font-semibold h-[48px]" 
          onPress={() => void load()} 
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
            <p className="mt-4 text-sm text-slate-600">No hay caja abierta en este terminal.</p>
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
              
              {summary && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Base inicial</p>
                    <p className="text-lg font-semibold text-slate-900">${summary.openingAmount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Esperado (Libro)</p>
                    <p className="text-lg font-semibold text-slate-900">${summary.expectedLedgerTotal.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
                    <p className="text-[10px] uppercase tracking-wider text-blue-600">Contado</p>
                    <p className="text-lg font-semibold text-blue-900">${(summary.countedTotal ?? 0).toLocaleString()}</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${summary.difference === 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Diferencia</p>
                    <p className={`text-lg font-semibold ${summary.difference === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                      ${(summary.difference ?? 0).toLocaleString()}
                    </p>
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

        <div className="surface rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Abrir caja</h2>
            <p className="mt-2 text-sm text-slate-600">Requiere permiso de apertura y terminal configurado.</p>
            <div className="mt-4">
              <Input
                label="Monto inicial"
                variant="flat"
                type="number"
                value={openAmount}
                onValueChange={setOpenAmount}
                isDisabled={busy || !!session}
              />
            </div>
            <div className="mt-3">
              <Textarea
                label="Observaciones de apertura"
                placeholder="Ej. efectivo inicial verificado..."
                variant="flat"
                value={openNotes}
                onValueChange={setOpenNotes}
                minRows={2}
                isDisabled={busy || !!session}
              />
            </div>
          </div>
          <div className="mt-6">
            <Button
              className="w-full font-bold"
              color="primary"
              size="lg"
              isDisabled={busy || !!session || !canOpen}
              isLoading={busy}
              onPress={() => void onOpen()}
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
              variant="flat"
              size="sm"
              className="max-w-[200px]"
              selectedKeys={filterType ? [filterType] : [""]}
              onSelectionChange={(keys) => setFilterType(Array.from(keys)[0] as string)}
            >
              <SelectItem key="">Todos los tipos</SelectItem>
              <SelectItem key="PARKING_PAYMENT">Cobro parqueo</SelectItem>
              <SelectItem key="MANUAL_INCOME">Ingreso manual</SelectItem>
              <SelectItem key="MANUAL_EXPENSE">Egreso manual</SelectItem>
              <SelectItem key="WITHDRAWAL">Retiro / Transferencia a Tesorería</SelectItem>
              <SelectItem key="CUSTOMER_REFUND">Devolucion al cliente</SelectItem>
              <SelectItem key="DISCOUNT">Descuento</SelectItem>
              <SelectItem key="ADJUSTMENT">Ajuste</SelectItem>
              <SelectItem key="LOST_TICKET_PAYMENT">Cobro ticket perdido</SelectItem>
              <SelectItem key="REPRINT_FEE">Reimpresion cobrada</SelectItem>
              <SelectItem key="VOID_OFFSET">Contrapartida anulacion</SelectItem>
            </Select>
            <Select
              label="Filtrar por medio"
              variant="flat"
              size="sm"
              className="max-w-[200px]"
              selectedKeys={filterMethod ? [filterMethod] : [""]}
              onSelectionChange={(keys) => setFilterMethod(Array.from(keys)[0] as string)}
            >
              <SelectItem key="">Todos los medios</SelectItem>
              <SelectItem key="CASH">Efectivo</SelectItem>
              <SelectItem key="DEBIT_CARD">Tarjeta débito</SelectItem>
              <SelectItem key="CREDIT_CARD">Tarjeta crédito</SelectItem>
              <SelectItem key="CARD">Tarjeta legacy</SelectItem>
              <SelectItem key="QR">QR</SelectItem>
              <SelectItem key="NEQUI">Nequi</SelectItem>
              <SelectItem key="DAVIPLATA">Daviplata</SelectItem>
              <SelectItem key="TRANSFER">Transferencia</SelectItem>
              <SelectItem key="AGREEMENT">Convenio</SelectItem>
              <SelectItem key="INTERNAL_CREDIT">Crédito interno</SelectItem>
              <SelectItem key="OTHER">Otro</SelectItem>
              <SelectItem key="MIXED">Mixto</SelectItem>
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
                      variant="flat"
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

          <h3 className="mt-8 text-base font-semibold text-slate-900">Ingreso / egreso manual</h3>
          <div className="mt-3 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-end">
            <Select
              label="Tipo de movimiento"
              variant="flat"
              size="sm"
              selectedKeys={[manualType]}
              onSelectionChange={(keys) => setManualType(Array.from(keys)[0] as string)}
              isDisabled={!canMove}
            >
              <SelectItem key="MANUAL_INCOME">Ingreso manual</SelectItem>
              <SelectItem key="MANUAL_EXPENSE">Egreso manual</SelectItem>
              <SelectItem key="WITHDRAWAL">Retiro / Transferencia a Tesorería</SelectItem>
              <SelectItem key="CUSTOMER_REFUND">Devolucion al cliente</SelectItem>
              <SelectItem key="DISCOUNT">Descuento</SelectItem>
              <SelectItem key="ADJUSTMENT">Ajuste autorizado</SelectItem>
              <SelectItem key="REPRINT_FEE">Reimpresion cobrada</SelectItem>
            </Select>
            <Select
              label="Medio de pago"
              variant="flat"
              size="sm"
              selectedKeys={[manualMethod]}
              onSelectionChange={(keys) => setManualMethod(Array.from(keys)[0] as string)}
              isDisabled={!canMove}
            >
              <SelectItem key="CASH">Efectivo</SelectItem>
              <SelectItem key="DEBIT_CARD">Tarjeta débito</SelectItem>
              <SelectItem key="CREDIT_CARD">Tarjeta crédito</SelectItem>
              <SelectItem key="CARD">Tarjeta legacy</SelectItem>
              <SelectItem key="QR">QR</SelectItem>
              <SelectItem key="NEQUI">Nequi</SelectItem>
              <SelectItem key="DAVIPLATA">Daviplata</SelectItem>
              <SelectItem key="TRANSFER">Transferencia</SelectItem>
              <SelectItem key="AGREEMENT">Convenio</SelectItem>
              <SelectItem key="INTERNAL_CREDIT">Crédito interno</SelectItem>
              <SelectItem key="OTHER">Otro</SelectItem>
              <SelectItem key="MIXED">Mixto</SelectItem>
            </Select>
            <Input
              label="Valor"
              variant="flat"
              size="sm"
              type="number"
              value={manualAmount}
              onValueChange={setManualAmount}
              isDisabled={!canMove}
            />
            <Input
              label="Motivo"
              variant="flat"
              size="sm"
              value={manualReason}
              onValueChange={setManualReason}
              isDisabled={!canMove}
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 font-bold"
              color="primary"
              variant="flat"
              isDisabled={busy || !canMove}
              isLoading={busy}
              onPress={() => void onAddManual()}
            >
              Registrar movimiento
            </Button>
            <Button
              className="flex-1 font-semibold"
              variant="bordered"
              color="primary"
              isDisabled={busy || movements.length === 0}
              onPress={() => void onPrintLastMovement()}
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
              variant="flat"
              size="sm"
              type="number"
              value={countCash}
              onValueChange={setCountCash}
            />
            <Input
              label="Tarjetas"
              variant="flat"
              size="sm"
              type="number"
              value={countCard}
              onValueChange={setCountCard}
            />
            <Input
              label="Transferencias"
              variant="flat"
              size="sm"
              type="number"
              value={countTransfer}
              onValueChange={setCountTransfer}
            />
            <Input
              label="Otros"
              variant="flat"
              size="sm"
              type="number"
              value={countOther}
              onValueChange={setCountOther}
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Observaciones de arqueo"
              placeholder="Describa cualquier novedad..."
              variant="flat"
              value={countNotes}
              onValueChange={setCountNotes}
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button 
              className="flex-1 font-bold" 
              color="primary" 
              variant="flat"
              isDisabled={busy} 
              isLoading={busy}
              onPress={() => void onCount()}
            >
              Guardar arqueo
            </Button>
            <Button
              className="flex-1 font-semibold"
              variant="bordered"
              color="primary"
              isDisabled={busy || !session.countedAt}
              onPress={() => void onPrintCount()}
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
            <Textarea
              label="Notas de cierre"
              placeholder="Obligatorias si hay diferencia..."
              variant="flat"
              value={closeNotes}
              onValueChange={setCloseNotes}
            />
          </div>
          <div className="mt-4">
            <Input
              label="Testigo / responsable firma (opcional)"
              placeholder="Nombre legible..."
              variant="flat"
              value={closingWitness}
              onValueChange={setClosingWitness}
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button 
              color="danger" 
              variant="flat" 
              className="flex-1 font-bold"
              isDisabled={busy} 
              isLoading={busy}
              onPress={() => void onClose()}
            >
              Cerrar caja (Fin turno)
            </Button>
            <Button
              color="primary"
              variant="flat"
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
              onPress={() => void onPrintClosing()}
            >
              Imprimir cierre
            </Button>
          </div>
        </div>
      ) : null}

      <Modal isOpen={showShiftChangeModal} onClose={() => setShowShiftChangeModal(false)}>
        <ModalContent>
          <ModalHeader>Cambio de turno</ModalHeader>
          <ModalBody>
            <p className="text-sm text-slate-600 mb-4">
              Se cerrará la caja actual y se dejará lista para la apertura del siguiente operador.
            </p>
            <Input
              label="Monto base para siguiente turno"
              variant="flat"
              type="number"
              value={nextOpenAmount}
              onValueChange={setNextOpenAmount}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setShowShiftChangeModal(false)}>
              Cancelar
            </Button>
            <Button color="primary" isLoading={busy} onPress={() => void onShiftChange()}>
              Confirmar Cambio
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={!!voidTarget} onClose={() => setVoidTarget(null)}>
        <ModalContent>
          <ModalHeader>Anular movimiento</ModalHeader>
          <ModalBody>
            <p className="text-sm text-slate-600 mb-2">Motivo obligatorio (auditoria).</p>
            <Textarea
              label="Motivo"
              placeholder="Describa la razón de la anulación..."
              variant="flat"
              value={voidReason}
              onValueChange={setVoidReason}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" color="primary" onPress={() => setVoidTarget(null)}>
              Cancelar
            </Button>
            <Button color="danger" isLoading={busy} onPress={() => void onVoid()}>
              Confirmar anulacion
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
