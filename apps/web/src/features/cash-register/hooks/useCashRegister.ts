"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  useCashRegisterStore,
  selectSession,
  selectPolicy,
  selectIsOpen,
  selectIsClosed,
  selectIsBusy,
  selectMovements,
  selectSummary,
  selectError,
} from "@/lib/stores/cash-register";

export function useCashRegister() {
  const store = useCashRegisterStore();
  const initialized = useRef(false);

  const session = useCashRegisterStore(selectSession);
  const policy = useCashRegisterStore(selectPolicy);
  const isOpen = useCashRegisterStore(selectIsOpen);
  const isClosed = useCashRegisterStore(selectIsClosed);
  const isBusy = useCashRegisterStore(selectIsBusy);
  const movements = useCashRegisterStore(selectMovements);
  const summary = useCashRegisterStore(selectSummary);
  const error = useCashRegisterStore(selectError);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    store.initialize(store.site, store.terminal);
  }, [store]);

  const reload = useCallback(async () => {
    await store.refreshAll();
  }, [store]);

  return {
    session,
    policy,
    isOpen,
    isClosed,
    isBusy,
    movements,
    summary,
    error,
    loading: store.loading,
    busy: store.busy,
    perms: store.perms,
    registerRows: store.registerRows,
    auditLog: store.auditLog,
    outboxCount: store.outboxCount,
    site: store.site,
    terminal: store.terminal,
    setSite: store.setSite,
    setTerminal: store.setTerminal,
    openSession: store.openSession,
    closeSession: store.closeSession,
    countSession: store.countSession,
    addMovement: store.addMovement,
    voidMovement: store.voidMovement,
    refreshAll: store.refreshAll,
    flushOutbox: store.flushOutbox,
    loadOutboxCount: store.loadOutboxCount,
    reload,
    clearSession: store.clearSession,
    setError: store.setError,
  };
}