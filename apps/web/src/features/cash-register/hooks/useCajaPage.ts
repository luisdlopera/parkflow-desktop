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
import { fetchConfigurationSites } from "@/lib/api/sites-api";
import { printCashThermalReceipt } from "@/lib/print/print-service";
import {
  buildCashCountTicket,
  buildCashMovementTicket,
} from "@/lib/cash/cash-print";
import { errorService } from "@/lib/errors/error-service";
import { useCashRegister } from "./useCashRegister";
import type { TicketDocument } from "@parkflow/types";
import type { Key } from "@heroui/react";
import { safeStorage } from "@/lib/utils/storage";

function defaultSite(): string {
  return (process.env.NEXT_PUBLIC_PARKING_SITE ?? "default").trim() || "default";
}

function defaultTerminal(): string {
  if (typeof window === "undefined") return "";
  return (
    process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() ||
    safeStorage.getItem("parkflow_terminal_id")?.trim() ||
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
  const [registerRows, setRegisterRows] = useState<CashRegisterRow[]>([]);
  const [auditLog, setAuditLog] = useState<CashAuditEntryDto[]>([]);
  const [closingWitness, setClosingWitness] = useState("");
  const [showShiftChangeModal, setShowShiftChangeModal] = useState(false);
  const [siteCount, setSiteCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);

  const cr = useCashRegister();
  const store = cr;

  const {
    manualForm, countForm, openForm, closeForm, voidForm, shiftForm,
    manualType, manualMethod,
    countCash, countCard, countTransfer, countOther, countNotes,
  } = useCajaForms();

  const parkingName = process.env.NEXT_PUBLIC_PARKING_NAME ?? "Parkflow";

  // Sync site/terminal to store when they change
  useEffect(() => {
    cr.setSite(site);
  }, [site, cr]);

  useEffect(() => {
    setTerminal(defaultTerminal());
  }, []);

  useEffect(() => {
    if (terminal) cr.setTerminal(terminal);
  }, [terminal, cr]);

  // Load registers, sites, outbox on mount
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
    cr.loadOutboxCount().catch(() => {});
    cr.flushOutbox().catch(() => {});
  }, [cr]);

  // Sync store error to local state
  useEffect(() => {
    if (store.error) setError(store.error);
  }, [store.error]);

  // Load audit log
  useEffect(() => {
    if (!cr.session?.id || !cr.perms.canAudit) {
      setAuditLog([]);
      return;
    }
    cashAudit(cr.session.id)
      .then(setAuditLog)
      .catch(() => setAuditLog([]));
  }, [cr.session?.id, cr.perms.canAudit]);

  // Local loading state
  const loading = store.loading;
  const isOpen = store.isOpen;
  const isClosed = store.isClosed;
  const busy = store.isBusy;

  const reload = useCallback(async () => {
    await cr.refreshAll();
  }, [cr]);

  const refreshOutbox = useCallback(async () => {
    const count = await import("@/lib/cash/cash-outbox-idb").then((m) => m.listCashOutboxPending());
    setOutboxCount(count.length);
  }, []);

  // ─── Action handlers ───
  const onOpen = useCallback(async () => {
    const amt = Number(openAmount.replace(",", ".")) || 0;
    const notes = openForm.getValues("openNotes").trim() || null;
    try {
      await cr.openSession(amt, notes);
      openForm.reset({ openNotes: "" });
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [openAmount, openForm, cr]);

  const onAddManual = useCallback(async (data: ManualFormValues) => {
    if (!cr.session || cr.session.status !== "OPEN") return;
    const amt = Number(data.manualAmount.replace(",", ".")) || 0;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    try {
      await cr.addMovement({
        type: data.manualType,
        paymentMethod: data.manualMethod,
        amount: amt,
        reason: data.manualReason || null,
      }, { offline });
      manualForm.setValue("manualAmount", "");
      manualForm.setValue("manualReason", "");
      refreshOutbox().catch(() => {});
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr, manualForm, refreshOutbox]);

  const onCount = useCallback(async (data: CountFormValues) => {
    try {
      await cr.countSession({
        countCash: Number(data.countCash.replace(",", ".")) || 0,
        countCard: Number(data.countCard.replace(",", ".")) || 0,
        countTransfer: Number(data.countTransfer.replace(",", ".")) || 0,
        countOther: Number(data.countOther.replace(",", ".")) || 0,
        observations: data.countNotes || null,
      });
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr]);

  const onClose = useCallback(async (confirmFn: () => Promise<boolean>) => {
    if (!cr.session) return;
    if (!cr.session.countedAt) {
      setError("Debe realizar el arqueo antes de cerrar la caja.");
      return;
    }
    if (cr.outboxCount > 0) {
      setError("NO PUEDE CERRAR LA CAJA. Tiene movimientos locales pendientes de sincronización.");
      return;
    }
    if (!(await confirmFn())) return;
    try {
      await cr.closeSession(
        closeForm.getValues("closeNotes") || null,
        closingWitness.trim() || null,
      );
      closeForm.reset({ closeNotes: "" });
      setClosingWitness("");
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr, closeForm, closingWitness]);

  const onShiftChange = useCallback(async () => {
    if (!cr.session) return;
    if (cr.session.status === "OPEN" && !cr.session.countedAt) {
      setError("Debe realizar el arqueo antes del cambio de turno.");
      return;
    }
    try {
      await cr.closeSession("Cierre por cambio de turno.", null);
      cr.clearSession();
      setOpenAmount(shiftForm.getValues("nextOpenAmount"));
      setShowShiftChangeModal(false);
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr, shiftForm]);

  const onVoid = useCallback(async () => {
    const voidReason = voidForm.getValues("voidReason");
    if (!cr.session || !voidTarget || !voidReason.trim()) return;
    try {
      await cr.voidMovement(voidTarget, voidReason.trim());
      setVoidTarget(null);
      voidForm.reset({ voidReason: "" });
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr, voidTarget, voidForm]);

  const onPrintClosing = useCallback(async () => {
    if (!cr.session) return;
    try {
      const p = await cashPrintClosing(cr.session.id);
      await printCashThermalReceipt(closingDocToTicket(p.ticketDocument), "CASH_CLOSING");
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr.session]);

  const onPrintLastMovement = useCallback(async () => {
    if (!cr.session || cr.movements.length === 0) {
      setError("No hay movimientos para imprimir");
      return;
    }
    try {
      await printCashThermalReceipt(
        buildCashMovementTicket(cr.session, cr.movements[0], parkingName),
        "CASH_MOVEMENT"
      );
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr.session, cr.movements, parkingName]);

  const onPrintCount = useCallback(async () => {
    if (!cr.session || !cr.summary) {
      setError("Guarde arqueo antes de imprimir");
      return;
    }
    try {
      await printCashThermalReceipt(
        buildCashCountTicket(cr.session, cr.summary, parkingName),
        "CASH_COUNT"
      );
    } catch (e) {
      setError(errorService.normalize(e).message);
    }
  }, [cr.session, cr.summary, parkingName]);

  const filteredMovements = useMemo(() => {
    return cr.movements.filter((m) => {
      if (filterType && m.movementType !== filterType) return false;
      if (filterMethod && m.paymentMethod !== filterMethod) return false;
      return true;
    });
  }, [cr.movements, filterType, filterMethod]);

  const onTerminalChange = useCallback((key: Key | null) => {
    const t = key as string;
    setTerminal(t);
    cr.setTerminal(t);
  }, [cr]);

  return {
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
    perms: cr.perms,
    session: cr.session,
    policy: cr.policy,
    movements: filteredMovements,
    allMovements: cr.movements,
    summary: cr.summary,
    loading,
    isOpen,
    closed: isClosed,
    manualForm, countForm, openForm, closeForm, voidForm, shiftForm,
    manualType, manualMethod,
    countCash, countCard, countTransfer, countOther, countNotes,
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
