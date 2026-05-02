"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { invoke } from "@tauri-apps/api/core";
import type {
  DesktopLicenseStatus,
  HeartbeatResponse,
  ProcessedCommand,
  TamperStatus,
  SaveLicenseRequest,
  Company,
  CreateCompanyRequest,
  GenerateLicenseRequest,
  GenerateLicenseResponse,
} from "./types";
import {
  sendHeartbeat,
  listCompanies,
  createCompany as apiCreateCompany,
  generateLicense as apiGenerateLicense,
} from "./api";

// ==================== Tauri/Desktop Licensing Hooks ====================

/**
 * Hook para gestionar el estado de licencia en el desktop
 */
export function useDesktopLicense() {
  const [status, setStatus] = useState<DesktopLicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await invoke<DesktopLicenseStatus>("get_license_status");
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}

/**
 * Hook para guardar una licencia recibida del servidor
 */
export function useSaveLicense() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const saveLicense = useCallback(async (request: SaveLicenseRequest) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await invoke("save_license", { request });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar licencia");
    } finally {
      setSaving(false);
    }
  }, []);

  return { saveLicense, saving, error, success };
}

/**
 * Hook para obtener el fingerprint del dispositivo
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFingerprint() {
      try {
        const result = await invoke<string>("get_device_fingerprint");
        setFingerprint(result);
      } catch (err) {
        console.error("Failed to get device fingerprint:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFingerprint();
  }, []);

  return { fingerprint, loading };
}

/**
 * Hook para verificar estado de anti-manipulación
 */
export function useTamperStatus() {
  const [status, setStatus] = useState<TamperStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      setLoading(true);
      const result = await invoke<TamperStatus>("check_tamper_status");
      setStatus(result);
    } catch (err) {
      console.error("Failed to check tamper status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { status, loading, check };
}

// ==================== Heartbeat Hook ====================

interface UseHeartbeatOptions {
  companyId: string;
  deviceFingerprint: string;
  appVersion: string;
  enabled: boolean;
  onCommand?: (command: ProcessedCommand) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para enviar heartbeats periódicos al servidor
 */
export function useHeartbeat(options: UseHeartbeatOptions) {
  const {
    companyId,
    deviceFingerprint,
    appVersion,
    enabled,
    onCommand,
    onError,
  } = options;

  const [lastResponse, setLastResponse] = useState<HeartbeatResponse | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeatFn = useCallback(async () => {
    try {
      const request = {
        companyId,
        deviceFingerprint,
        appVersion,
      };

      const response = await sendHeartbeat(request);
      setLastResponse(response);
      setIsOnline(true);

      // Procesar comando remoto si existe
      if (response.command && onCommand) {
        const processed: ProcessedCommand = await invoke(
          "process_heartbeat_response",
          { response }
        );
        onCommand(processed);
      }
    } catch (err) {
      setIsOnline(false);
      onError?.(err instanceof Error ? err : new Error("Heartbeat failed"));
    }
  }, [companyId, deviceFingerprint, appVersion, onCommand, onError]);

  useEffect(() => {
    if (!enabled) return;

    // Enviar inmediatamente al iniciar
    sendHeartbeatFn();

    // Configurar intervalo (30 minutos por defecto)
    const intervalMinutes = lastResponse?.nextHeartbeatMinutes ?? 30;
    intervalRef.current = setInterval(
      sendHeartbeatFn,
      intervalMinutes * 60 * 1000
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, sendHeartbeatFn, lastResponse?.nextHeartbeatMinutes]);

  return { lastResponse, isOnline, sendHeartbeat: sendHeartbeatFn };
}

// ==================== License UI Helpers ====================

/**
 * Determina el color y estado visual basado en los días restantes
 */
export function getLicenseStatusColor(daysRemaining: number, gracePeriod: boolean): {
  color: "success" | "warning" | "danger" | "default";
  label: string;
} {
  if (gracePeriod) {
    return { color: "danger", label: "Período de gracia" };
  }

  if (daysRemaining < 0) {
    return { color: "danger", label: "Expirada" };
  }

  if (daysRemaining <= 7) {
    return { color: "danger", label: `${daysRemaining} días` };
  }

  if (daysRemaining <= 14) {
    return { color: "warning", label: `${daysRemaining} días` };
  }

  if (daysRemaining <= 30) {
    return { color: "warning", label: `${daysRemaining} días` };
  }

  return { color: "success", label: `${daysRemaining} días` };
}

/**
 * Traduce el tipo de plan a español
 */
export function translatePlan(plan: string): string {
  const translations: Record<string, string> = {
    LOCAL: "Local / Offline",
    SYNC: "Sync / Cloud",
    PRO: "Pro / Multi-sede",
    ENTERPRISE: "Enterprise",
  };
  return translations[plan] || plan;
}

/**
 * Traduce el estado de licencia a español
 */
export function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    ACTIVE: "Activa",
    PAST_DUE: "Pago atrasado",
    SUSPENDED: "Suspendida",
    BLOCKED: "Bloqueada",
    EXPIRED: "Expirada",
    TRIAL: "Prueba",
    CANCELLED: "Cancelada",
  };
  return translations[status] || status;
}

/**
 * Obtiene descripción de qué puede hacer el usuario según el plan
 */
export function getPlanFeatures(plan: string): string[] {
  const features: Record<string, string[]> = {
    LOCAL: [
      "Operación 100% offline",
      "Tickets y caja local",
      "Impresión térmica",
      "Sin sincronización cloud",
      "Ideal para zonas sin internet",
    ],
    SYNC: [
      "Todo lo de Local PLUS:",
      "Sincronización cloud",
      "Dashboard web",
      "Backup automático",
      "Reportes en la nube",
    ],
    PRO: [
      "Todo lo de Sync PLUS:",
      "Multi-sede",
      "Auditoría avanzada",
      "Monitoreo en tiempo real",
      "Reportes personalizados",
      "Múltiples cajas",
    ],
    ENTERPRISE: [
      "Todo lo de Pro PLUS:",
      "Funcionalidades personalizadas",
      "SLA garantizado",
      "Soporte prioritario",
      "Integraciones API",
    ],
  };
  return features[plan] || features.LOCAL;
}

// ==================== ADMIN HOOKS ====================

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook para listar todas las empresas (Super Admin)
 */
export function useCompanies() {
  const { data, error, isLoading, mutate } = useSWR<Company[]>(
    "/api/v1/licensing/companies",
    async () => {
      const companies = await listCompanies();
      return companies;
    },
    {
      refreshInterval: 30000, // Refrescar cada 30 segundos
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

/**
 * Hook para crear una nueva empresa
 */
export function useCreateCompany() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCompany = useCallback(async (request: CreateCompanyRequest): Promise<Company> => {
    setIsLoading(true);
    setError(null);

    try {
      const company = await apiCreateCompany(request);
      return company;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error al crear empresa");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createCompany, isLoading, error };
}

/**
 * Hook para generar una licencia offline
 */
export function useGenerateLicense() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [license, setLicense] = useState<GenerateLicenseResponse | null>(null);

  const generateLicense = useCallback(
    async (request: GenerateLicenseRequest): Promise<GenerateLicenseResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiGenerateLicense(request);
        setLicense(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Error al generar licencia");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearLicense = useCallback(() => {
    setLicense(null);
    setError(null);
  }, []);

  return { generateLicense, license, isLoading, error, clearLicense };
}
