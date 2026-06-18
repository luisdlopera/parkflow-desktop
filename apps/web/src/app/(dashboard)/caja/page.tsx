"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ListBox, SearchField, useFilter, Tabs, type Key } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { CashSummaryTotals } from "./CashSummaryTotals";
import { CashAuditLog } from "./CashAuditLog";
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
import { fetchConfigurationSites } from "@/lib/settings-api";
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

function getStepColor(done: boolean, isCountPending: boolean, index: number): string {
  if (done) return "bg-emerald-500 text-white";
  if (isCountPending && index === 2) return "bg-blue-500 text-white";
  return "bg-slate-200 text-slate-400";
}

function CountDiffIndicator({
  countCash,
  countCard,
  countTransfer,
  countOther,
  expectedLedgerTotal,
}: {
  countCash: string;
  countCard: string;
  countTransfer: string;
  countOther: string;
  expectedLedgerTotal: number;
}) {
  const parsed =
    (Number(countCash.replace(",", ".")) || 0) +
    (Number(countCard.replace(",", ".")) || 0) +
    (Number(countTransfer.replace(",", ".")) || 0) +
    (Number(countOther.replace(",", ".")) || 0);
  const diff = parsed - expectedLedgerTotal;

  if (parsed === 0) return null;

  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        diff === 0
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <p>
        <strong>Total contado:</strong> ${parsed.toLocaleString()} &mdash;{" "}
        <strong>Esperado:</strong> ${expectedLedgerTotal.toLocaleString()}
        {diff !== 0 ? (
          <span className="font-semibold">
            {" "}
            &mdash; <strong>Diferencia:</strong>{" "}
            {diff > 0 ? "+" : ""}${diff.toLocaleString()}
            {diff !== 0 && (
              <span className="ml-1 text-amber-700">
                (requiere observaciones)
              </span>
            )}
          </span>
        ) : (
          <span className="text-emerald-700 font-semibold"> &mdash; Coincide ✓</span>
        )}
      </p>
    </div>
  );
}

// ─── Form schemas (react-hook-form + zod) ───
// Schemas are intentionally permissive (string-shaped): the rich, context-aware
// validation (diff-requires-notes, offline caps, witness, etc.) stays in the
// submit handlers so behavior is preserved 1:1 with the previous controlled state.
const manualSchema = z.object({
  manualType: z.string(),
  manualMethod: z.string(),
  manualAmount: z.string(),
  manualReason: z.string(),
});
type ManualFormValues = z.infer<typeof manualSchema>;

const countSchema = z.object({
  countCash: z.string(),
  countCard: z.string(),
  countTransfer: z.string(),
  countOther: z.string(),
  countNotes: z.string(),
});
type CountFormValues = z.infer<typeof countSchema>;

const openSchema = z.object({ openNotes: z.string() });
type OpenFormValues = z.infer<typeof openSchema>;

const closeSchema = z.object({ closeNotes: z.string() });
type CloseFormValues = z.infer<typeof closeSchema>;

const voidSchema = z.object({ voidReason: z.string() });
type VoidFormValues = z.infer<typeof voidSchema>;

const shiftSchema = z.object({ nextOpenAmount: z.string() });
type ShiftFormValues = z.infer<typeof shiftSchema>;

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
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [policy, setPolicy] = useState<CashPolicyDto | null>(null);
  const [registerRows, setRegisterRows] = useState<CashRegisterRow[]>([]);
  const [auditLog, setAuditLog] = useState<CashAuditEntryDto[]>([]);
  const [closingWitness, setClosingWitness] = useState("");
  const [showShiftChangeModal, setShowShiftChangeModal] = useState(false);
  const [siteCount, setSiteCount] = useState(1);

  // ─── react-hook-form: one form per cash flow ───
  const manualForm = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: { manualType: "MANUAL_INCOME", manualMethod: "CASH", manualAmount: "", manualReason: "" },
  });
  const countForm = useForm<CountFormValues>({
    resolver: zodResolver(countSchema),
    defaultValues: { countCash: "", countCard: "", countTransfer: "", countOther: "", countNotes: "" },
  });
  const openForm = useForm<OpenFormValues>({
    resolver: zodResolver(openSchema),
    defaultValues: { openNotes: "" },
  });
  const closeForm = useForm<CloseFormValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: { closeNotes: "" },
  });
  const voidForm = useForm<VoidFormValues>({
    resolver: zodResolver(voidSchema),
    defaultValues: { voidReason: "" },
  });
  const shiftForm = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { nextOpenAmount: "0" },
  });

  // Live values for HeroUI Autocompletes (controlled by the form).
  const manualType = useWatch({ control: manualForm.control, name: "manualType" });
  const manualMethod = useWatch({ control: manualForm.control, name: "manualMethod" });

  // Live count values for the arqueo diff indicator / notes validation.
  const countCash = useWatch({ control: countForm.control, name: "countCash" });
  const countCard = useWatch({ control: countForm.control, name: "countCard" });
  const countTransfer = useWatch({ control: countForm.control, name: "countTransfer" });
  const countOther = useWatch({ control: countForm.control, name: "countOther" });
  const countNotes = useWatch({ control: countForm.control, name: "countNotes" });
  const { confirm } = useDialog();
  const { contains } = useFilter({ sensitivity: "base" });

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
    fetchConfigurationSites({ active: true, page: 0, size: 1 })
      .then((page) => setSiteCount(page.totalElements))
      .catch(() => setSiteCount(1));
  }, []);

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


  const [perms, setPerms] = useState({
    canOpen: false,
    canClose: false,
    canMove: false,
    canVoid: false,
    canAudit: false,
  });
  const { canOpen, canClose, canMove, canVoid, canAudit } = perms;

  // Stable column definition so DataTable's React.memo isn't invalidated every
  // render. Only depends on canVoid (setVoidTarget is a stable state setter).
  const movementColumns = useMemo<DataTableColumn<CashMovementDto>[]>(
    () => [
      {
        key: "createdAt",
        label: "Fecha",
        render: (m) => new Date(m.createdAt).toLocaleString(),
      },
      { key: "movementType", label: "Tipo" },
      { key: "paymentMethod", label: "Medio" },
      { key: "amount", label: "Valor", align: "right" },
      {
        key: "registrar",
        label: "Registra",
        render: (m) => m.createdByName ?? m.createdById?.slice(0, 8),
      },
      {
        key: "terminal",
        label: "Equipo",
        render: (m) => m.terminal ?? "—",
      },
      { key: "status", label: "Estado" },
      {
        key: "actions",
        label: "Acciones",
        render: (m) =>
          m.status === "POSTED" && m.movementType !== "VOID_OFFSET" && canVoid ? (
            <Button
              size="sm"
              variant="tertiary"
              color="danger"
              onPress={() => setVoidTarget(m.id)}
            >
              Anular
            </Button>
          ) : null,
      },
    ],
    [canVoid],
  );

  useEffect(() => {
    (async () => {
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
        notes: openForm.getValues("openNotes").trim() || null
      });
      setSession(s);
      openForm.reset({ openNotes: "" });
      await load();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  };

  const onAddManual = async (data: ManualFormValues) => {
    if (!session || session.status !== "OPEN") {
      return;
    }
    const { manualType, manualMethod, manualAmount, manualReason } = data;
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
      manualForm.setValue("manualAmount", "");
      manualForm.setValue("manualReason", "");
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

  const onCount = async (data: CountFormValues) => {
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
        `Hay diferencia de $${Math.abs(counted - summary.expectedLedgerTotal).toLocaleString()} respecto al esperado ($${summary.expectedLedgerTotal.toLocaleString()}). Las observaciones son obligatorias cuando hay diferencia.`
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await cashCount(session.id, {
        countCash: vals.cash,
        countCard: vals.card,
        countTransfer: vals.transfer,
        countOther: vals.other,
        observations: data.countNotes || null
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
        closingNotes: closeForm.getValues("closeNotes") || null,
        closingWitnessName: closingWitness.trim() || null,
        closeIdempotencyKey: `close:${session.id}:${Date.now()}`
      });
      closeForm.reset({ closeNotes: "" });
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
      setOpenAmount(shiftForm.getValues("nextOpenAmount"));
      setError("Turno cerrado con éxito. Indique base para el nuevo turno.");
      await load();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.CASH_OPERATION));
    } finally {
      setBusy(false);
    }
  };

  const onVoid = async () => {
    const voidReason = voidForm.getValues("voidReason");
    if (!session || !voidTarget || !voidReason.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await cashVoidMovement(session.id, voidTarget, voidReason.trim(), `void:${voidTarget}`);
      setVoidTarget(null);
      voidForm.reset({ voidReason: "" });
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

      <div className={`grid gap-4 grid-cols-1 items-end ${siteCount > 1 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {siteCount > 1 && (
          <Input
            label="Sede"
            
            size="sm"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            isDisabled={closed}
          />
        )}
        <div className="flex flex-col gap-2">
          {registerRows.length > 0 && (
            <Autocomplete
              label="Terminal / caja"
              placeholder="Seleccionar terminal"
              selectionMode="single"
              value={registerRows.some((r) => r.terminal === terminal) ? terminal : null}
              onChange={(key: Key | null) => setTerminal(key as string)}
              isDisabled={closed}
            >
              <Autocomplete.Trigger>
                <Autocomplete.Value />
                <Autocomplete.ClearButton />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar terminal">
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Buscar terminal..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <ListBox>
                    {registerRows.map((r) => (
                      <ListBox.Item key={r.terminal} id={r.terminal} textValue={r.terminal}>
                        {(r.label ?? r.terminal) + ` (${r.terminal})`}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
            </Autocomplete>
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

      <div className={`grid gap-4 sm:gap-6 grid-cols-1 ${session ? "" : "lg:grid-cols-2"}`}>
        {!session || session.status !== "OPEN" ? (
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
                          className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStepColor(step.done, !session.countedAt, i)}`}
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

              {summary && <CashSummaryTotals summary={summary} />}

              {session.notes ? (
                <p className="mt-2 rounded-lg bg-amber-50/50 px-3 py-2 text-slate-800 italic">
                  &quot;{session.notes}&quot;
                </p>
              ) : null}

              <CashAuditLog auditLog={auditLog} canAudit={canAudit} />
            </div>
          )}
        </div>
        ) : null}

        {!session ? (
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
        ) : null}
      </div>

      {session?.status === "OPEN" ? (
        <>
          <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
            <h2 className="text-lg font-semibold text-slate-900">Estado actual</h2>
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
                          className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStepColor(step.done, !session.countedAt, i)}`}
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

                {summary && <CashSummaryTotals summary={summary} />}

                {session.notes ? (
                  <p className="mt-2 rounded-lg bg-amber-50/50 px-3 py-2 text-slate-800 italic">
                    &quot;{session.notes}&quot;
                  </p>
                ) : null}

                <CashAuditLog auditLog={auditLog} canAudit={canAudit} />
              </div>
            </div>

            <Tabs className="w-full mt-6">
              <Tabs.ListContainer>
                <Tabs.List aria-label="Opciones de caja" className="w-full sm:w-fit overflow-x-auto">
                  <Tabs.Tab id="movimientos">Movimientos<Tabs.Indicator /></Tabs.Tab>
                  <Tabs.Tab id="arqueos">Arqueos<Tabs.Indicator /></Tabs.Tab>
                  {canClose && <Tabs.Tab id="cierre">Cierre<Tabs.Indicator /></Tabs.Tab>}
                </Tabs.List>
              </Tabs.ListContainer>

              <Tabs.Panel id="movimientos" className="pt-4">
            <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
              <h2 className="text-lg font-semibold text-slate-900">Movimientos</h2>
          <div className="mt-4 flex flex-wrap gap-4 mb-6">
            <Autocomplete
              label="Filtrar por tipo"
              className="max-w-[200px]"
              placeholder="Todos los tipos"
              selectionMode="single"
              value={filterType || null}
              onChange={(key: Key | null) => setFilterType(key as string)}
            >
              <Autocomplete.Trigger>
                <Autocomplete.Value />
                <Autocomplete.ClearButton />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar tipo">
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Buscar tipo..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <ListBox>
                    <ListBox.Item key="" id="" textValue="Todos los tipos">Todos los tipos</ListBox.Item>
                    <ListBox.Item key="PARKING_PAYMENT" id="PARKING_PAYMENT" textValue="Cobro parqueo">Cobro parqueo</ListBox.Item>
                    <ListBox.Item key="MANUAL_INCOME" id="MANUAL_INCOME" textValue="Ingreso manual">Ingreso manual</ListBox.Item>
                    <ListBox.Item key="MANUAL_EXPENSE" id="MANUAL_EXPENSE" textValue="Egreso manual">Egreso manual</ListBox.Item>
                    <ListBox.Item key="WITHDRAWAL" id="WITHDRAWAL" textValue="Retiro / Transferencia a Tesorería">Retiro / Transferencia a Tesorería</ListBox.Item>
                    <ListBox.Item key="CUSTOMER_REFUND" id="CUSTOMER_REFUND" textValue="Devolucion al cliente">Devolucion al cliente</ListBox.Item>
                    <ListBox.Item key="DISCOUNT" id="DISCOUNT" textValue="Descuento">Descuento</ListBox.Item>
                    <ListBox.Item key="ADJUSTMENT" id="ADJUSTMENT" textValue="Ajuste">Ajuste</ListBox.Item>
                    <ListBox.Item key="LOST_TICKET_PAYMENT" id="LOST_TICKET_PAYMENT" textValue="Cobro ticket perdido">Cobro ticket perdido</ListBox.Item>
                    <ListBox.Item key="REPRINT_FEE" id="REPRINT_FEE" textValue="Reimpresion cobrada">Reimpresion cobrada</ListBox.Item>
                    <ListBox.Item key="VOID_OFFSET" id="VOID_OFFSET" textValue="Contrapartida anulacion">Contrapartida anulacion</ListBox.Item>
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
            </Autocomplete>
            <Autocomplete
              label="Filtrar por medio"
              className="max-w-[200px]"
              placeholder="Todos los medios"
              selectionMode="single"
              value={filterMethod || null}
              onChange={(key: Key | null) => setFilterMethod(key as string)}
            >
              <Autocomplete.Trigger>
                <Autocomplete.Value />
                <Autocomplete.ClearButton />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar medio">
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Buscar medio..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <ListBox>
                    <ListBox.Item key="" id="" textValue="Todos los medios">Todos los medios</ListBox.Item>
                    <ListBox.Item key="CASH" id="CASH" textValue="Efectivo">Efectivo</ListBox.Item>
                    <ListBox.Item key="DEBIT_CARD" id="DEBIT_CARD" textValue="Tarjeta débito">Tarjeta débito</ListBox.Item>
                    <ListBox.Item key="CREDIT_CARD" id="CREDIT_CARD" textValue="Tarjeta crédito">Tarjeta crédito</ListBox.Item>
                    <ListBox.Item key="CARD" id="CARD" textValue="Tarjeta legacy">Tarjeta legacy</ListBox.Item>
                    <ListBox.Item key="QR" id="QR" textValue="QR">QR</ListBox.Item>
                    <ListBox.Item key="NEQUI" id="NEQUI" textValue="Nequi">Nequi</ListBox.Item>
                    <ListBox.Item key="DAVIPLATA" id="DAVIPLATA" textValue="Daviplata">Daviplata</ListBox.Item>
                    <ListBox.Item key="TRANSFER" id="TRANSFER" textValue="Transferencia">Transferencia</ListBox.Item>
                    <ListBox.Item key="AGREEMENT" id="AGREEMENT" textValue="Convenio">Convenio</ListBox.Item>
                    <ListBox.Item key="INTERNAL_CREDIT" id="INTERNAL_CREDIT" textValue="Crédito interno">Crédito interno</ListBox.Item>
                    <ListBox.Item key="OTHER" id="OTHER" textValue="Otro">Otro</ListBox.Item>
                    <ListBox.Item key="MIXED" id="MIXED" textValue="Mixto">Mixto</ListBox.Item>
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
            </Autocomplete>
          </div>
          
          <DataTable<CashMovementDto>
            columns={movementColumns}
            rows={filteredMovements}
          />
          {filteredMovements.length === 0 && session?.status === "OPEN" ? (
            <p className="mt-3 text-xs text-slate-500 text-center">
              No hay movimientos registrados en esta sesión. Los cobros de salida y movimientos manuales aparecerán aquí.
            </p>
          ) : null}

          <h3 className="mt-8 text-base font-semibold text-slate-900">Ingreso / egreso manual</h3>
          <div className="mt-3 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-end">
            <Autocomplete
              label="Tipo de movimiento"
              placeholder="Seleccionar tipo"
              selectionMode="single"
              value={manualType}
              onChange={(key: Key | null) => manualForm.setValue("manualType", (key as string) ?? "")}
              isDisabled={!canMove}
            >
              <Autocomplete.Trigger>
                <Autocomplete.Value />
                <Autocomplete.ClearButton />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar tipo">
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Buscar tipo..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <ListBox>
                    <ListBox.Item key="MANUAL_INCOME" id="MANUAL_INCOME" textValue="Ingreso manual">Ingreso manual</ListBox.Item>
                    <ListBox.Item key="MANUAL_EXPENSE" id="MANUAL_EXPENSE" textValue="Egreso manual">Egreso manual</ListBox.Item>
                    <ListBox.Item key="WITHDRAWAL" id="WITHDRAWAL" textValue="Retiro / Transferencia a Tesorería">Retiro / Transferencia a Tesorería</ListBox.Item>
                    <ListBox.Item key="CUSTOMER_REFUND" id="CUSTOMER_REFUND" textValue="Devolucion al cliente">Devolucion al cliente</ListBox.Item>
                    <ListBox.Item key="DISCOUNT" id="DISCOUNT" textValue="Descuento">Descuento</ListBox.Item>
                    <ListBox.Item key="ADJUSTMENT" id="ADJUSTMENT" textValue="Ajuste autorizado">Ajuste autorizado</ListBox.Item>
                    <ListBox.Item key="REPRINT_FEE" id="REPRINT_FEE" textValue="Reimpresion cobrada">Reimpresion cobrada</ListBox.Item>
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
            </Autocomplete>
            <Autocomplete
              label="Medio de pago"
              placeholder="Seleccionar medio"
              selectionMode="single"
              value={manualMethod}
              onChange={(key: Key | null) => manualForm.setValue("manualMethod", (key as string) ?? "")}
              isDisabled={!canMove}
            >
              <Autocomplete.Trigger>
                <Autocomplete.Value />
                <Autocomplete.ClearButton />
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover>
                <Autocomplete.Filter filter={contains}>
                  <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar medio">
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Buscar medio..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <ListBox>
                    <ListBox.Item key="CASH" id="CASH" textValue="Efectivo">Efectivo</ListBox.Item>
                    <ListBox.Item key="DEBIT_CARD" id="DEBIT_CARD" textValue="Tarjeta débito">Tarjeta débito</ListBox.Item>
                    <ListBox.Item key="CREDIT_CARD" id="CREDIT_CARD" textValue="Tarjeta crédito">Tarjeta crédito</ListBox.Item>
                    <ListBox.Item key="CARD" id="CARD" textValue="Tarjeta legacy">Tarjeta legacy</ListBox.Item>
                    <ListBox.Item key="QR" id="QR" textValue="QR">QR</ListBox.Item>
                    <ListBox.Item key="NEQUI" id="NEQUI" textValue="Nequi">Nequi</ListBox.Item>
                    <ListBox.Item key="DAVIPLATA" id="DAVIPLATA" textValue="Daviplata">Daviplata</ListBox.Item>
                    <ListBox.Item key="TRANSFER" id="TRANSFER" textValue="Transferencia">Transferencia</ListBox.Item>
                    <ListBox.Item key="AGREEMENT" id="AGREEMENT" textValue="Convenio">Convenio</ListBox.Item>
                    <ListBox.Item key="INTERNAL_CREDIT" id="INTERNAL_CREDIT" textValue="Crédito interno">Crédito interno</ListBox.Item>
                    <ListBox.Item key="OTHER" id="OTHER" textValue="Otro">Otro</ListBox.Item>
                    <ListBox.Item key="MIXED" id="MIXED" textValue="Mixto">Mixto</ListBox.Item>
                  </ListBox>
                </Autocomplete.Filter>
              </Autocomplete.Popover>
            </Autocomplete>
            <Controller
              name="manualAmount"
              control={manualForm.control}
              render={({ field }) => (
                <Input
                  label="Valor"
                  size="sm"
                  type="number"
                  {...field}
                  isDisabled={!canMove}
                />
              )}
            />
            <Controller
              name="manualReason"
              control={manualForm.control}
              render={({ field }) => (
                <Input
                  label="Motivo"
                  size="sm"
                  {...field}
                  isDisabled={!canMove}
                />
              )}
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 font-bold"
              color="primary"
              isDisabled={busy || !canMove}
              isLoading={busy}
              onPress={() => { manualForm.handleSubmit(onAddManual)().catch(console.error); }}
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
        </Tabs.Panel>

        <Tabs.Panel id="arqueos" className="pt-4">
          <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
            <h2 className="text-lg font-semibold text-slate-900">Arqueo</h2>
          <p className="mt-2 text-sm text-slate-600">
            Si hay diferencia respecto al esperado, las observaciones son obligatorias.
          </p>
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Controller
              name="countCash"
              control={countForm.control}
              render={({ field }) => (
                <Input label="Efectivo contado" size="sm" type="number" {...field} />
              )}
            />
            <Controller
              name="countCard"
              control={countForm.control}
              render={({ field }) => (
                <Input label="Tarjetas" size="sm" type="number" {...field} />
              )}
            />
            <Controller
              name="countTransfer"
              control={countForm.control}
              render={({ field }) => (
                <Input label="Transferencias" size="sm" type="number" {...field} />
              )}
            />
            <Controller
              name="countOther"
              control={countForm.control}
              render={({ field }) => (
                <Input label="Otros" size="sm" type="number" {...field} />
              )}
            />
          </div>

          {summary && (
            <CountDiffIndicator
              countCash={countCash}
              countCard={countCard}
              countTransfer={countTransfer}
              countOther={countOther}
              expectedLedgerTotal={summary.expectedLedgerTotal}
            />
          )}

          <div className="mt-4">
            <Controller
              name="countNotes"
              control={countForm.control}
              render={({ field }) => (
              <TextArea
              label="Observaciones de arqueo"
              placeholder={(() => {
                if (!summary) return "Describa cualquier novedad...";
                const parsedTotal =
                  (Number(countCash.replace(",", ".")) || 0) +
                  (Number(countCard.replace(",", ".")) || 0) +
                  (Number(countTransfer.replace(",", ".")) || 0) +
                  (Number(countOther.replace(",", ".")) || 0);
                return parsedTotal !== summary.expectedLedgerTotal
                  ? "OBLIGATORIAS: hay diferencia respecto al esperado"
                  : "Describa cualquier novedad...";
              })()}
              isInvalid={
                summary
                  ? (() => {
                      const parsedTotal =
                        (Number(countCash.replace(",", ".")) || 0) +
                        (Number(countCard.replace(",", ".")) || 0) +
                        (Number(countTransfer.replace(",", ".")) || 0) +
                        (Number(countOther.replace(",", ".")) || 0);
                      return parsedTotal !== summary.expectedLedgerTotal && !countNotes.trim();
                    })()
                  : false
              }
              errorMessage={
                summary
                  ? (() => {
                      const parsedTotal =
                        (Number(countCash.replace(",", ".")) || 0) +
                        (Number(countCard.replace(",", ".")) || 0) +
                        (Number(countTransfer.replace(",", ".")) || 0) +
                        (Number(countOther.replace(",", ".")) || 0);
                      if (parsedTotal !== summary.expectedLedgerTotal && !countNotes.trim()) {
                        return "Las observaciones son obligatorias cuando el conteo difiere del esperado";
                      }
                      return "";
                    })()
                  : undefined
              }
              {...field}
            />
              )}
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 font-bold"
              color="primary"
              isDisabled={busy}
              isLoading={busy}
              onPress={() => { countForm.handleSubmit(onCount)().catch(console.error); }}
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
            </div>
          </Tabs.Panel>

          {canClose && (
            <Tabs.Panel id="cierre" className="pt-4">
              <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
                <h3 className="text-lg font-semibold text-slate-900">Cierre</h3>
              <p className="mt-2 text-xs text-slate-500">
                El usuario que ejecuta el cierre queda registrado en el sistema. Opcionalmente indique nombre
                para constancia física de testigo o supervisor.
              </p>
              <div className="mt-4">
                <Controller
                  name="closeNotes"
                  control={closeForm.control}
                  render={({ field }) => (
                    <TextArea
                      label="Notas de cierre"
                      placeholder="Obligatorias si hay diferencia..."
                      {...field}
                    />
                  )}
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
            </Tabs.Panel>
          )}
        </Tabs>
        </>
      ) : null}

      {session?.status === "OPEN" && !canClose ? (
        <p className="mt-6 text-xs text-slate-500 italic">
          No tienes permiso para cerrar la caja. Solicita el permiso <strong>cierres_caja:cerrar</strong>.
        </p>
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
            <Controller
              name="nextOpenAmount"
              control={shiftForm.control}
              render={({ field }) => (
                <Input
                  label="Monto base para siguiente turno"
                  type="number"
                  {...field}
                />
              )}
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
            <Controller
              name="voidReason"
              control={voidForm.control}
              render={({ field }) => (
                <TextArea
                  label="Motivo"
                  placeholder="Describa la razón de la anulación..."
                  {...field}
                />
              )}
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
