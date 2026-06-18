"use client";
import { useState, useEffect } from "react";
import type { VehicleType } from "@parkflow/types";

export type OperatorMode = "beginner" | "expert" | "speed";

export interface OperatorSettings {
  mode: OperatorMode;
  defaultVehicleType: VehicleType;
  rememberLocation: boolean;
  skipConditionCheck: boolean;
  platePrefix: string;
}

const STORAGE_KEY = "parkflow_operator_settings";

const defaultSettings: OperatorSettings = {
  mode: "beginner",
  defaultVehicleType: "CAR",
  rememberLocation: true,
  skipConditionCheck: false,
  platePrefix: "",
};

function readFromStorage(): OperatorSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as OperatorSettings;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return defaultSettings;
}

export function useOperatorSettings() {
  const [settings, setSettings] = useState<OperatorSettings>(readFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<OperatorSettings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  return { settings, update };
}
