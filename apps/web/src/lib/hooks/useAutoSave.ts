"use client";

import { useEffect, useRef, useCallback } from "react";

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

/**
 * Hook para auto-guardado de formularios.
 * Guarda automáticamente los datos del formulario en localStorage
 * y permite recuperarlos después de un crash o cierre accidental.
 */
export function useAutoSave<T>({
  key,
  data,
  interval = 3000,
  onRestore,
  enabled = true
}: AutoSaveOptions<T>) {
  const savedRef = useRef(false);
  const keyRef = useRef(`parkflow_autosave_${key}`);

  // Guardar automáticamente cada intervalo
  useEffect(() => {
    if (!enabled) return;

    const saveData = () => {
      const state: AutoSaveState<T> = {
        data,
        timestamp: Date.now(),
        url: window.location.href
      };
      localStorage.setItem(keyRef.current, JSON.stringify(state));
      savedRef.current = true;
    };

    const timer = setInterval(saveData, interval);
    
    // Guardar inmediatamente si hay cambios significativos
    saveData();

    return () => clearInterval(timer);
  }, [data, interval, enabled]);

  // Limpiar autosave al salir de la página exitosamente
  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(keyRef.current);
    savedRef.current = false;
  }, []);

  // Restaurar datos después de crash
  const restoreData = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(keyRef.current);
      if (!saved) return null;

      const state: AutoSaveState<T> = JSON.parse(saved);
      
      // Verificar que los datos son de la misma URL
      if (state.url !== window.location.href) {
        return null;
      }

      // Verificar que los datos no son muy antiguos (máximo 24 horas)
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

  // Verificar si hay datos para recuperar
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
    isSaved: savedRef.current
  };
}

/**
 * Hook para detectar recuperación después de crash
 */
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
