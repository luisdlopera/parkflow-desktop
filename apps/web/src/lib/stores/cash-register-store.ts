import { create } from "zustand";
import type { CashSessionDto, CashPolicyDto } from "@/lib/cash/cash-api";

interface CashRegisterState {
  session: CashSessionDto | null;
  policy: CashPolicyDto | null;
  isOpen: boolean;
}

interface CashRegisterActions {
  setSession: (session: CashSessionDto | null) => void;
  setPolicy: (policy: CashPolicyDto) => void;
  clearSession: () => void;
}

type CashRegisterStore = CashRegisterState & CashRegisterActions;

export const useCashRegisterStore = create<CashRegisterStore>((set) => ({
  session: null,
  policy: null,
  isOpen: false,

  setSession: (session) =>
    set({ session, isOpen: session !== null && session.status === "OPEN" }),

  setPolicy: (policy) => set({ policy }),

  clearSession: () => set({ session: null, isOpen: false }),
}));

export const selectIsOpen = (s: CashRegisterStore) => s.isOpen;
export const selectSession = (s: CashRegisterStore) => s.session;
export const selectPolicy = (s: CashRegisterStore) => s.policy;
