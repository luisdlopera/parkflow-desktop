"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  cashRegisters,
  cashAudit,
  cashPrintClosing,
  type CashAuditEntryDto,
  type CashMovementDto,
  type CashRegisterRow,
} from "@/lib/cash/cash-api";
import type { ManualFormValues, CountFormValues } from "@/lib/validation/cash-session.schema";
import { useCajaForms } from "./useCajaForms";
import { fetchConfigurationSites } from "@/lib/settings-api";
import { listCashOutboxPending } from "@/lib/cash/cash-outbox-idb";
import { flushCashMovementOutbox } from "@/lib/cash/cash-sync";
import { currentUser, hasPermission } from "@/lib/auth";
import { printCashThermalReceipt, startLocalPrintQueueWorker } from "@/lib/print/print-service";
import { buildCashCountTicket, buildCashMovementTicket } from "@/lib/cash/cash-print";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { useCajaSession } from "./useCajaSession";
import { useCajaMovements } from "./useCajaMovements";
import type { TicketDocument } from "@parkflow/types";
import type { Key } from "@heroui/react";

function defaultSite(): string {
  return (process.env.NEXT_PUBLIC_PARKING_SITE ?? "default").trim() || "default";
}

function defaultTerminal(): string {
  if (typeof window === "undefined") return "";
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
    detailLines: Array.isArray(lines) ? (lines as string[]) : null,
  };
}

export function useCajaPage() {
  const [site, setSite] = useState(defaultSite);
  const [terminal, setTerminal] = useState("");
  const [openAmount, setOpenAmount] = useState("0");
  const [filterType, setFilterType] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [registerRows, setRegisterRows] = useState<CashRegisterRow[]>([]);
  const [auditLog, setAuditLog] = useState<CashAuditEntryDto[]>([]);
  const [closingWitness, setClosingWitness] = useState("");
  const [showShiftChangeModal, setShowShiftChangeModal] = useState(false);
  const [siteCount, setSiteCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perms, setPerms] = useState({
    canOpen: false,
    canClose: false,
    canMove: false,
    canVoid: false,
    canAudit: false,
  });

  const sessionHook = useCajaSession(site, terminal);
  const { session, policy, loading, reload: reloadSession } = sessionHook;

  const movementsHook = useCajaMovements(session?.id ?? null);
  const { movements, summary, load: loadMovements } = movementsHook;

  const {
    manualForm, countForm, openForm, closeForm, voidForm, shiftForm,
    manualType, manualMethod,
    countCash, countCard, countTransfer, countOther, countNotes,
  } = useCajaForms();

  const parkingName = process.env.NEXT_PUBLIC_PARKING_NAME ?? "Parkflow";

  const refreshOutbox = useCallback(async () => {
    const rows = await listCashOutboxPending();
    setOutboxCount(rows.length);
  }, []);

  const reload = useCallback(async () => {
    await reloadSession();
    if (session?.id) await loadMovements();
  }, [reloadSession, session?.id, loadMovements]);

  // ─── Setup effects ───
  useEffect(() => {
    setTerminal(defaultTerminal());
  }, []);

  useEffect(() => {
    cashRegisters(site || defaultSite())
      .then(setRegisterRows)
      .catch(() => setRegisterRows([]));
  }, [site]);

  useEffect(() => {
    fetchConfigurationSites({ active: true, page: 0, size: 1 })
      .then((page) => setSiteCount(page.totalElements))
      .catch(() => setSiteCount(1));
  }, []);

  useEffect(() => {
    startLocalPrintQueueWorker();
    refreshOutbox().catch(() => {});
    flushCashMovementOutbox()
      .then(() => refreshOutbox().catch(() => {}))
      .catch(() => {});
  }, [refreshOutbox]);

  useEffect(() => {
    (async () => {
      try {
        const [canOpenP, canCloseP, canMoveP, canVoidP, reportsP] = await Promise.all([
          hasPermission("cierres_caja:abrir"),
          hasPermission("cierres_caja:cerrar"),
          hasPermission("cobros:registrar"),
          hasPermission("anulaciones:crear"),
          hasPermission("reportes:leer"),
        ]);
        setPerms({
          canOpen: canOpenP,
          canClose: canCloseP,
          canMove: canMoveP,
          canVoid: canVoidP,
          canAudit: reportsP || canCloseP,
        });
      } catch {
        // Permissions default to false on error
      }
    })();
  }, []);

  useEffect(() => {
    if (!session?.id || !perms.canAudit) {
      setAuditLog([]);
      return;
    }
    cashAudit(session.id)
      .then(setAuditLog)
      .catch(() => setAuditLog([]));
  }, [session?.id, perms.canAudit]);

  useEffect(() => {
    if (session?.id) loadMovements().catch(() => {});
  }, [session?.id, loadMovements]);

  // ─── Action handlers ───
  const onOpen = useCallback(async () => {
    const u = await currentUser();
    if (!u) { setError("Sesion requerida"); return; }
    const term = terminal || defaultTerminal();
    if (!term) { setError("Terminal obligatorio"); return; }
    setBusy(true);
    setError(null);
    try {
      await sessionHook.openSession({
        openingAmount: Number(openAmount.replace(",", ".")) || 0,
        operatorUserId: u.id,
        notes: openForm.getValues("openNotes").trim() || null,
      });
      openForm.reset({ openNotes: "" });
      await reloadSession();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  }, [terminal, openAmount, openForm, sessionHook, reloadSession]);

  const onAddManual = useCallback(async (data: ManualFormValues) => {
    if (!session || session.status !== "OPEN") return;
    const amt = Number(data.manualAmount.replace(",", ".")) || 0;
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine &&
      policy &&
      amt > policy.offlineMaxManualMovement
    ) {
      setError(
        `Sin conexion: el tope para movimientos manuales offline es ${policy.offlineMaxManualMovement.toLocaleString("es-CO")}.`
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      await movementsHook.addMovement(
        {
          type: data.manualType,
          paymentMethod: data.manualMethod,
          amount: amt,
          reason: data.manualReason || null,
          idempotencyKey: `mov:${session.id}:${Date.now()}`,
        },
        { offline }
      );
      manualForm.setValue("manualAmount", "");
      manualForm.setValue("manualReason", "");
      refreshOutbox().catch(() => {});
    } catch (e) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const { enqueueCashMovementOffline } = await import("@/lib/cash/cash-outbox-idb");
        await enqueueCashMovementOffline(session.id, {
          type: data.manualType,
          paymentMethod: data.manualMethod,
          amount: Number(data.manualAmount.replace(",", ".")) || 0,
          reason: data.manualReason,
          idempotencyKey: `offline:${session.id}:${Date.now()}`,
        });
        setError("Sin conexion: movimiento guardado en cola local para sincronizar.");
        refreshOutbox().catch(() => {});
      } else {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
      }
    } finally {
      setBusy(false);
    }
  }, [session, policy, movementsHook, manualForm, refreshOutbox]);

  const onCount = useCallback(async (data: CountFormValues) => {
    if (!session) return;
    const vals = {
      cash: Number(data.countCash.replace(",", ".")) || 0,
      card: Number(data.countCard.replace(",", ".")) || 0,
      transfer: Number(data.countTransfer.replace(",", ".")) || 0,
      other: Number(data.countOther.replace(",", ".")) || 0,
    };
    const counted = vals.cash + vals.card + vals.transfer + vals.other;
    if (summary && counted !== summary.expectedLedgerTotal && !data.countNotes.trim()) {
      setError(
        `Hay diferencia de $${Math.abs(counted - summary.expectedLedgerTotal).toLocaleString()} respecto al esperado. Las observaciones son obligatorias cuando hay diferencia.`
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sessionHook.countSession({
        countCash: vals.cash,
        countCard: vals.card,
        countTransfer: vals.transfer,
        countOther: vals.other,
        observations: data.countNotes || null,
      });
      await loadMovements();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  }, [session, summary, sessionHook, loadMovements]);

  const onClose = useCallback(async (confirmFn: () => Promise<boolean>) => {
    if (!session) return;
    if (!session.countedAt) {
      setError("Debe realizar el arqueo antes de cerrar la caja.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine && policy && !policy.offlineCloseAllowed) {
      setError("Sin conexion: el cierre definitivo no esta permitido offline con la politica actual.");
      return;
    }
    if (outboxCount > 0) {
      setError("NO PUEDE CERRAR LA CAJA. Tiene movimientos locales pendientes de sincronización.");
      return;
    }
    if (!(await confirmFn())) return;
    setBusy(true);
    setError(null);
    try {
      await sessionHook.closeSession({
        closingNotes: closeForm.getValues("closeNotes") || null,
        closingWitnessName: closingWitness.trim() || null,
      });
      closeForm.reset({ closeNotes: "" });
      setClosingWitness("");
      await loadMovements();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  }, [session, policy, outboxCount, sessionHook, closeForm, closingWitness, loadMovements]);

  const onShiftChange = useCallback(async () => {
    if (!session) return;
    if (session.status === "OPEN" && !session.countedAt) {
      setError("Debe realizar el arqueo antes del cambio de turno.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sessionHook.closeSession({
        closingNotes: "Cierre por cambio de turno.",
      });
      sessionHook.clearSession();
      setOpenAmount(shiftForm.getValues("nextOpenAmount"));
      setShowShiftChangeModal(false);
      setError("Turno cerrado con éxito. Indique base para el nuevo turno.");
      await reloadSession();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  }, [session, sessionHook, shiftForm, reloadSession]);

  const onVoid = useCallback(async () => {
    const voidReason = voidForm.getValues("voidReason");
    if (!session || !voidTarget || !voidReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await movementsHook.voidMovement(voidTarget, voidReason.trim());
      setVoidTarget(null);
      voidForm.reset({ voidReason: "" });
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  }, [session, voidTarget, voidForm, movementsHook]);

  const onPrintClosing = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const p = await cashPrintClosing(session.id);
      await printCashThermalReceipt(closingDocToTicket(p.ticketDocument), "CASH_CLOSING");
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.PRINT_ACTION));
    } finally {
      setBusy(false);
    }
  }, [session]);

  const onPrintLastMovement = useCallback(async () => {
    if (!session || movements.length === 0) {
      setError("No hay movimientos para imprimir");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await printCashThermalReceipt(
        buildCashMovementTicket(session, movements[0], parkingName),
        "CASH_MOVEMENT"
      );
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.PRINT_ACTION));
    } finally {
      setBusy(false);
    }
  }, [session, movements, parkingName]);

  const onPrintCount = useCallback(async () => {
    if (!session || !summary) {
      setError("Guarde arqueo antes de imprimir");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await printCashThermalReceipt(
        buildCashCountTicket(session, summary, parkingName),
        "CASH_COUNT"
      );
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.PRINT_ACTION));
    } finally {
      setBusy(false);
    }
  }, [session, summary, parkingName]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (filterType && m.movementType !== filterType) return false;
      if (filterMethod && m.paymentMethod !== filterMethod) return false;
      return true;
    });
  }, [movements, filterType, filterMethod]);

  const onTerminalChange = useCallback((key: Key | null) => setTerminal(key as string), []);

  return {
    // State
    site, setSite,
    terminal, setTerminal, onTerminalChange,
    openAmount, setOpenAmount,
    filterType, setFilterType,
    filterMethod, setFilterMethod,
    voidTarget, setVoidTarget,
    outboxCount,
    registerRows,
    auditLog,
    closingWitness, setClosingWitness,
    showShiftChangeModal, setShowShiftChangeModal,
    siteCount,
    busy,
    error, setError,
    perms,
    // From session hook
    session, policy, loading,
    isOpen: session?.status === "OPEN",
    closed: session?.status === "CLOSED",
    // From movements hook
    movements: filteredMovements,
    allMovements: movements,
    summary,
    // Forms
    manualForm, countForm, openForm, closeForm, voidForm, shiftForm,
    // Watched values
    manualType, manualMethod,
    countCash, countCard, countTransfer, countOther, countNotes,
    // Actions
    reload,
    onOpen,
    onAddManual,
    onCount,
    onClose,
    onShiftChange,
    onVoid,
    onPrintClosing,
    onPrintLastMovement,
    onPrintCount,
  };
}
