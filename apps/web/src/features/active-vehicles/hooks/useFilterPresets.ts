"use client";
import { useState, useCallback, useEffect } from "react";
import { safeStorage } from "@/lib/utils/storage";

const STORAGE_KEY = "parkflow-vehicles-filter-presets";

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      safeStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const savePreset = useCallback((name: string, filters: Record<string, string>) => {
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => [...prev, preset]);
    return preset;
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePreset = useCallback((id: string, filters: Record<string, string>) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, filters } : p)),
    );
  }, []);

  return {
    presets,
    savePreset,
    deletePreset,
    updatePreset,
  };
}
