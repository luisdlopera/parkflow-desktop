"use client";
import { useState, useCallback, useEffect } from "react";
import { safeStorage } from "@/lib/utils/storage";

const STORAGE_KEY = "parkflow-vehicles-columns";

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "plate", label: "Placa", defaultVisible: true },
  { key: "ticketNumber", label: "Ticket", defaultVisible: true },
  { key: "vehicleType", label: "Tipo", defaultVisible: true },
  { key: "parkingSpaceCode", label: "Celda", defaultVisible: true },
  { key: "duration", label: "Tiempo", defaultVisible: true },
  { key: "rateName", label: "Tarifa", defaultVisible: false },
  { key: "cascos", label: "Cascos", defaultVisible: true },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export function useColumnVisibility() {
  const [visible, setVisible] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(DEFAULT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      safeStorage.removeItem(STORAGE_KEY);
    }
    return new Set(DEFAULT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
  });

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]));
  }, [visible]);

  const toggleColumn = useCallback((key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isVisible = useCallback((key: string) => visible.has(key), [visible]);

  const resetColumns = useCallback(() => {
    setVisible(new Set(DEFAULT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)));
  }, []);

  return {
    columns: DEFAULT_COLUMNS,
    visible,
    toggleColumn,
    isVisible,
    resetColumns,
  };
}
