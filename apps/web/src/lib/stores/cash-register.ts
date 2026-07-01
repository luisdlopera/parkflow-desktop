import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  CashSessionDto,
  CashPolicyDto,
  CashMovementDto,
  CashSummaryDto,
  CashRegisterRow,
} from "@/lib/cash/cash-api";
import {
  cashCurrent,
  cashOpen,
  cashClose,
  cashCount,
  cashMovements,
  cashSummary,
  cashAddMovement,
  cashVoidMovement,
  cashRegisters,
  cashPolicy,
  cashAudit,
} from "@/lib/cash/cash-api";
import {
  enqueueCashMovementOffline,
  listCashOutboxPending,
  removeCashOutboxRow,
  markCashOutboxError,
} from "@/lib/cash/cash-outbox-idb";
import { currentUser } from "@/lib/services/auth-domain.service";
import { safeStorage } from "@/lib/utils/storage";

type CashRegisterAction = "OPEN" | "CLOSE" | "COUNT" | "MOVEMENT" | "VOID" | "LOAD" | "SYNC";

interface CashRegisterPermissions {
  canOpen: boolean;
  canClose: boolean;
  canMove: boolean;
  canVoid: boolean;
  canAudit: boolean;
}

interface CashRegisterState {
  session: CashSessionDto | null;
  policy: CashPolicyDto | null;
  movements: CashMovementDto[];
  summary: CashSummaryDto | null;
  registerRows: CashRegisterRow[];
  auditLog: CashAuditEntryDto[];
  outboxCount: number;

  loading: boolean;
  error: string | null;
  busy: Record<CashRegisterAction, boolean>;

  perms: CashRegisterPermissions;
  site: string;
  terminal: string;
}

type CashAuditEntryDto = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorName: string | null;
  terminalId: string | null;
  clientIp: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  metadata: string | null;
  createdAt: string;
};

interface CashRegisterActions {
  initialize: (site: string, terminal: string) => Promise<void>;
  loadSession: () => Promise<void>;
  loadPolicy: () => Promise<void>;
  loadMovements: () => Promise<void>;
  loadRegisters: () => Promise<void>;
  loadAudit: () => Promise<void>;
  loadOutboxCount: () => Promise<void>;
  loadPermissions: () => Promise<void>;

  openSession: (openingAmount: number, notes?: string | null) => Promise<void>;
  closeSession: (closingNotes?: string | null, witnessName?: string | null) => Promise<void>;
  countSession: (data: {
    countCash: number;
    countCard: number;
    countTransfer: number;
    countOther: number;
    observations?: string | null;
  }) => Promise<void>;
  addMovement: (data: {
    type: string;
    paymentMethod: string;
    amount: number;
    reason?: string | null;
  }, options?: { offline?: boolean }) => Promise<void>;
  voidMovement: (movementId: string, reason: string) => Promise<void>;

  flushOutbox: () => Promise<{ synced: number; failed: number }>;

  refreshAll: () => Promise<void>;
  clearSession: () => void;
  setSite: (site: string) => void;
  setTerminal: (terminal: string) => void;
  setSession: (session: CashSessionDto | null) => void;
  setPolicy: (policy: CashPolicyDto | null) => void;
  setError: (error: string | null) => void;
  setAuditLog: (log: CashAuditEntryDto[]) => void;
}

type CashRegisterStore = CashRegisterState & CashRegisterActions;

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

export const useCashRegisterStore = create<CashRegisterStore>()(
  subscribeWithSelector((set, get) => ({
    session: null,
    policy: null,
    movements: [],
    summary: null,
    registerRows: [],
    auditLog: [],
    outboxCount: 0,

    loading: true,
    error: null,
    busy: {
      OPEN: false,
      CLOSE: false,
      COUNT: false,
      MOVEMENT: false,
      VOID: false,
      LOAD: false,
      SYNC: false,
    },

    perms: {
      canOpen: false,
      canClose: false,
      canMove: false,
      canVoid: false,
      canAudit: false,
    },

    site: defaultSite(),
    terminal: defaultTerminal(),

    setSite: (site) => set({ site }),
    setTerminal: (terminal) => set({ terminal }),
    setSession: (session) => set({ session }),
    setPolicy: (policy) => set({ policy }),
    setError: (error) => set({ error }),
    setAuditLog: (auditLog) => set({ auditLog }),

    initialize: async (site, terminal) => {
      set({ site, terminal, loading: true });
      const p = Promise.all([
        get().loadPolicy(),
        get().loadRegisters(),
        get().loadPermissions(),
      ]);
      if (terminal) {
        await Promise.all([p, get().loadSession()]);
      } else {
        await p;
      }
      set({ loading: false });
    },

    loadSession: async () => {
      const { site, terminal } = get();
      if (!terminal) return;
      set({ loading: true, error: null });
      try {
        const s = await cashCurrent(site || undefined, terminal || undefined);
        set({ session: s });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("404") && !msg.includes("No active")) {
          set({ error: msg, session: null });
        } else {
          set({ session: null });
        }
      } finally {
        set({ loading: false });
      }
    },

    loadPolicy: async () => {
      const { site } = get();
      try {
        const p = await cashPolicy(site || undefined);
        set({ policy: p });
      } catch {
        set({ policy: null });
      }
    },

    loadMovements: async () => {
      const { session } = get();
      if (!session) return;
      set((s) => ({ busy: { ...s.busy, LOAD: true } }));
      try {
        const [mv, sm] = await Promise.all([
          cashMovements(session.id),
          cashSummary(session.id),
        ]);
        set({ movements: mv, summary: sm });
      } catch {
        set({ movements: [], summary: null });
      } finally {
        set((s) => ({ busy: { ...s.busy, LOAD: false } }));
      }
    },

    loadRegisters: async () => {
      const { site } = get();
      try {
        const rows = await cashRegisters(site || defaultSite());
        set({ registerRows: rows });
      } catch {
        set({ registerRows: [] });
      }
    },

    loadAudit: async () => {
      const { session, perms } = get();
      if (!session?.id || !perms.canAudit) {
        set({ auditLog: [] });
        return;
      }
      try {
        const log = await cashAudit(session.id);
        set({ auditLog: log });
      } catch {
        set({ auditLog: [] });
      }
    },

    loadOutboxCount: async () => {
      const rows = await listCashOutboxPending();
      set({ outboxCount: rows.length });
    },

    loadPermissions: async () => {
      try {
        const [canOpenP, canCloseP, canMoveP, canVoidP, reportsP] = await Promise.all([
          import("@/lib/services/auth-domain.service").then((m) => m.hasPermission("cierres_caja:abrir")),
          import("@/lib/services/auth-domain.service").then((m) => m.hasPermission("cierres_caja:cerrar")),
          import("@/lib/services/auth-domain.service").then((m) => m.hasPermission("cobros:registrar")),
          import("@/lib/services/auth-domain.service").then((m) => m.hasPermission("anulaciones:crear")),
          import("@/lib/services/auth-domain.service").then((m) => m.hasPermission("reportes:leer")),
        ]);
        set({
          perms: {
            canOpen: canOpenP,
            canClose: canCloseP,
            canMove: canMoveP,
            canVoid: canVoidP,
            canAudit: reportsP || canCloseP,
          },
        });
      } catch {
        // defaults to false
      }
    },

    openSession: async (openingAmount, notes) => {
      const { site, terminal } = get();
      if (!terminal) return;
      set((s) => ({ busy: { ...s.busy, OPEN: true }, error: null }));
      try {
        const u = await currentUser();
        if (!u) throw new Error("Sesión requerida");
        const result = await cashOpen({
          site: site || "default",
          terminal,
          openingAmount,
          operatorUserId: u.id,
          openIdempotencyKey: `open:${terminal}:${new Date().toDateString()}`,
          notes: notes || null,
        });
        set({ session: result });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Error al abrir caja" });
        throw err;
      } finally {
        set((s) => ({ busy: { ...s.busy, OPEN: false } }));
      }
    },

    closeSession: async (closingNotes, closingWitnessName) => {
      const { session } = get();
      if (!session) return;
      set((s) => ({ busy: { ...s.busy, CLOSE: true }, error: null }));
      try {
        const result = await cashClose(session.id, {
          closingNotes: closingNotes || null,
          closingWitnessName: closingWitnessName || null,
          closeIdempotencyKey: `close:${session.id}:${Date.now()}`,
        });
        set({ session: result });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Error al cerrar caja" });
        throw err;
      } finally {
        set((s) => ({ busy: { ...s.busy, CLOSE: false } }));
      }
    },

    countSession: async (data) => {
      const { session } = get();
      if (!session) return;
      set((s) => ({ busy: { ...s.busy, COUNT: true }, error: null }));
      try {
        const result = await cashCount(session.id, data);
        set({ session: result });
        await get().loadMovements();
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Error en arqueo" });
        throw err;
      } finally {
        set((s) => ({ busy: { ...s.busy, COUNT: false } }));
      }
    },

    addMovement: async (data, options) => {
      const { session } = get();
      if (!session || session.status !== "OPEN") return;
      set((s) => ({ busy: { ...s.busy, MOVEMENT: true }, error: null }));
      try {
        await cashAddMovement(
          session.id,
          {
            type: data.type,
            paymentMethod: data.paymentMethod,
            amount: data.amount,
            reason: data.reason || null,
            idempotencyKey: `mov:${session.id}:${Date.now()}`,
          },
          options,
        );
        await get().loadMovements();
        await get().loadOutboxCount();
      } catch (err) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await enqueueCashMovementOffline(session.id, {
            ...data,
            idempotencyKey: `offline:${session.id}:${Date.now()}`,
          });
          await get().loadOutboxCount();
        } else {
          set({ error: err instanceof Error ? err.message : "Error al registrar movimiento" });
          throw err;
        }
      } finally {
        set((s) => ({ busy: { ...s.busy, MOVEMENT: false } }));
      }
    },

    voidMovement: async (movementId, reason) => {
      const { session } = get();
      if (!session) return;
      set((s) => ({ busy: { ...s.busy, VOID: true }, error: null }));
      try {
        await cashVoidMovement(session.id, movementId, reason, `void:${movementId}`);
        await get().loadMovements();
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Error al anular movimiento" });
        throw err;
      } finally {
        set((s) => ({ busy: { ...s.busy, VOID: false } }));
      }
    },

    flushOutbox: async () => {
      const rows = await listCashOutboxPending();
      let synced = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          const body = JSON.parse(row.payloadJson) as {
            type: string;
            paymentMethod: string;
            amount: number;
            reason?: string | null;
            idempotencyKey?: string | null;
          };
          const { session } = get();
          if (!session) continue;
          await cashAddMovement(session.id, {
            type: body.type,
            paymentMethod: body.paymentMethod,
            amount: body.amount,
            reason: body.reason ?? null,
            idempotencyKey: body.idempotencyKey ?? `outbox:${row.id}`,
          });
          await removeCashOutboxRow(row.id);
          synced++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await markCashOutboxError(row.id, msg);
          failed++;
        }
      }
      await get().loadOutboxCount();
      await get().loadMovements();
      return { synced, failed };
    },

    refreshAll: async () => {
      await Promise.all([
        get().loadSession(),
        get().loadPolicy(),
        get().loadRegisters(),
        get().loadPermissions(),
        get().loadOutboxCount(),
      ]);
      const { session } = get();
      if (session) {
        await Promise.all([
          get().loadMovements(),
          get().loadAudit(),
        ]);
      }
    },

    clearSession: () => set({ session: null, movements: [], summary: null, auditLog: [] }),
  })),
);

export const selectSession = (s: CashRegisterStore) => s.session;
export const selectPolicy = (s: CashRegisterStore) => s.policy;
export const selectIsOpen = (s: CashRegisterStore) => s.session?.status === "OPEN";
export const selectIsClosed = (s: CashRegisterStore) => s.session?.status === "CLOSED";
export const selectIsBusy = (s: CashRegisterStore) =>
  Object.values(s.busy).some((b) => b);
export const selectMovements = (s: CashRegisterStore) => s.movements;
export const selectSummary = (s: CashRegisterStore) => s.summary;
export const selectError = (s: CashRegisterStore) => s.error;
