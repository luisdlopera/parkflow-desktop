"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface AutoSaveOptions<T> {
  key: string;
  data: T;
  interval?: number;
  onRestore?: (data: T) => void;
  enabled?: boolean;
}

interface AutoSaveState<T> {
  data: T;
  timestamp: number;
  url: string;
}

export function useAutoSave<T>({
  key,
  data,
  interval = 3000,
  onRestore,
  enabled = true
}: AutoSaveOptions<T>) {
  const savedRef = useRef(false);
  const keyRef = useRef(`parkflow_autosave_${key}`);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const saveData = () => {
      const now = Date.now();
      const state: AutoSaveState<T> = {
        data,
        timestamp: now,
        url: window.location.href
      };
      localStorage.setItem(keyRef.current, JSON.stringify(state));
      savedRef.current = true;
      setLastSavedAt(new Date(now));
    };

    const timer = setInterval(saveData, interval);
    saveData();

    return () => clearInterval(timer);
  }, [data, interval, enabled]);

  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(keyRef.current);
    savedRef.current = false;
  }, []);

  const restoreData = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(keyRef.current);
      if (!saved) return null;

      const state: AutoSaveState<T> = JSON.parse(saved);
      if (state.url !== window.location.href) return null;

      const hoursSinceSave = (Date.now() - state.timestamp) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        localStorage.removeItem(keyRef.current);
        return null;
      }

      return state.data;
    } catch {
      return null;
    }
  }, []);

  const hasRestorableData = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(keyRef.current);
      if (!saved) return false;

      const state: AutoSaveState<T> = JSON.parse(saved);
      if (state.url !== window.location.href) return false;

      const hoursSinceSave = (Date.now() - state.timestamp) / (1000 * 60 * 60);
      return hoursSinceSave <= 24;
    } catch {
      return false;
    }
  }, []);

  return {
    clearAutoSave,
    restoreData,
    hasRestorableData,
    isSaved: savedRef.current,
    lastSavedAt,
  };
}

export function useCrashRecovery() {
  const checkForRecovery = useCallback(<T,>(key: string): { recovered: boolean; data?: T; timestamp?: Date } => {
    try {
      const storageKey = `parkflow_autosave_${key}`;
      const saved = localStorage.getItem(storageKey);

      if (!saved) {
        return { recovered: false };
      }

      const state = JSON.parse(saved);
      const hoursSinceSave = (Date.now() - state.timestamp) / (1000 * 60 * 60);

      if (hoursSinceSave > 24) {
        localStorage.removeItem(storageKey);
        return { recovered: false };
      }

      return {
        recovered: true,
        data: state.data,
        timestamp: new Date(state.timestamp)
      };
    } catch {
      return { recovered: false };
    }
  }, []);

  const clearRecovery = useCallback((key: string) => {
    localStorage.removeItem(`parkflow_autosave_${key}`);
  }, []);

  return { checkForRecovery, clearRecovery };
}
