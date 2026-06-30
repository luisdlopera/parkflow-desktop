"use client";

import {
  useCashRegisterStore,
  selectSession,
  selectPolicy,
  selectIsOpen,
  selectIsClosed,
  selectIsBusy,
} from "@/lib/stores/cash-register";

export function useCurrentCashRegister() {
  const session = useCashRegisterStore(selectSession);
  const policy = useCashRegisterStore(selectPolicy);
  const isOpen = useCashRegisterStore(selectIsOpen);
  const isClosed = useCashRegisterStore(selectIsClosed);
  const isBusy = useCashRegisterStore(selectIsBusy);

  return {
    session,
    policy,
    isOpen,
    isClosed,
    isBusy,
    requireOpenForPayment: policy?.requireOpenForPayment ?? true,
  };
}