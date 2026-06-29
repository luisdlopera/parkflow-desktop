"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "@heroui/react";
import { Monitor, Globe, CheckCircle, XCircle, AlertTriangle, CircleHelp } from "lucide-react";

interface PrinterStatus {
  isOnline: boolean;
  paperStatus: "ok" | "low" | "out" | "unknown";
  lastCheck: Date;
  queueSize: number;
  lastError?: string;
  isTauri: boolean;
  isChecked: boolean;
}

/**
 * PrintStatusMonitor - Monitorea el estado de la impresora térmica
 *
 * Estados posibles:
 * - Estado impresora: Online/Offline/Desconectada
 * - Papel: OK/Bajo/Vacío/Desconocido
 * - Cola: Número de trabajos pendientes
 *
 * Sin agente local: Significa que no hay Print Agent local ni Tauri ejecutándose.
 * En este modo, los tickets se guardan en cola offline y se imprimirán cuando
 * haya conexión disponible.
 */
export function PrintStatusMonitor() {
  const [status, setStatus] = useState<PrinterStatus>({
    isOnline: false,
    paperStatus: "unknown",
    lastCheck: new Date(),
    queueSize: 0,
    isTauri: false,
    isChecked: false
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAlerted, setHasAlerted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const warning = toast.warning;
  const error = toast.danger;
  const success = toast.success;

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isExpanded && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isExpanded]);

  const checkPrinterStatus = useCallback(async () => {
    try {
      // Verificar si estamos en Tauri
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

      if (!isTauri) {
        // Sin Tauri: usar cola offline, verificar Print Agent vía API
        setStatus(prev => ({
          ...prev,
          isTauri: false,
          isOnline: false,
          isChecked: true,
          lastCheck: new Date()
        }));
        return;
      }

      const { invoke } = await import("@tauri-apps/api/core");

      // Llamar al comando de health check de la impresora
      const result = await invoke<{
        online: boolean;
        status_byte?: number | null;
        has_paper?: boolean | null;
        status_hint?: string | null;
        error?: string | null;
      }>("printer_health_esc_pos");

      const hasPaper = result.has_paper;
      const paperStatus = (
        hasPaper == null ? "unknown" : hasPaper ? "ok" : "out"
      ) as PrinterStatus["paperStatus"];

      const outboxStats = await invoke<{
        pending: number;
        processing: number;
        failed: number;
        dead_letter: number;
        synced: number;
      }>("get_outbox_stats", {});

      setStatus({
        isTauri: true,
        isOnline: result.online,
        paperStatus,
        lastCheck: new Date(),
        queueSize: outboxStats.pending + outboxStats.failed + outboxStats.processing,
        lastError: result.error ?? undefined,
        isChecked: true
      });

      // Alertar solo una vez por problema
      if (!result.online && !hasAlerted) {
        error("Impresora desconectada. Verifique conexión USB/Red.");
        setHasAlerted(true);
      } else if (result.online && hasAlerted) {
        success("Impresora reconectada correctamente.");
        setHasAlerted(false);
      }

      if (paperStatus === "out" && !hasAlerted) {
        error("¡Sin papel! La impresora necesita recarga.");
        setHasAlerted(true);
      } else if (paperStatus === "low" && !hasAlerted) {
        warning("Papel bajo. Considere recargar pronto.");
        setHasAlerted(true);
      }

    } catch (err) {
      // Error al verificar: probablemente no hay impresora configurada
      setStatus(prev => ({
        ...prev,
        isTauri: typeof window !== "undefined" && "__TAURI_INTERNALS__" in window,
        isOnline: false,
        isChecked: true,
        lastError: err instanceof Error ? err.message : "No se pudo verificar",
        lastCheck: new Date()
      }));
    }
  }, [hasAlerted, error, warning, success]);

  // Check periódico cada 30 segundos
  useEffect(() => {
    checkPrinterStatus();
    const interval = setInterval(checkPrinterStatus, 30000);
    return () => clearInterval(interval);
  }, [checkPrinterStatus]);

  const getStatusColor = () => {
    if (!status.isChecked || !status.isTauri) return "bg-default-400";
    if (!status.isOnline) return "bg-rose-500";
    if (status.paperStatus === "out") return "bg-rose-500";
    if (status.paperStatus === "low") return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStatusText = () => {
    if (!status.isChecked) return "Verificando...";
    if (!status.isTauri) return "Modo Web";
    if (!status.isOnline) return "Desconectada";
    if (status.paperStatus === "out") return "Sin papel";
    if (status.paperStatus === "low") return "Papel bajo";
    if (status.paperStatus === "ok") return "Lista";
    return "Online";
  };

  const getStatusDescription = () => {
    if (!status.isTauri) {
      return "Sin conexión directa a impresora. Los tickets se guardan en cola offline.";
    }
    if (!status.isOnline) {
      return "No se detecta impresora. Verifique conexión USB o red.";
    }
    if (status.paperStatus === "out") {
      return "La impresora no tiene papel. Recargue antes de continuar.";
    }
    if (status.paperStatus === "low") {
      return "Papel bajo. Considere recargar pronto.";
    }
    if (status.paperStatus === "ok") {
      return "Impresora lista y funcionando correctamente.";
    }
    return "Estado de impresora desconocido.";
  };

  const dropdownContent = (
    <div
      className="fixed w-72 bg-default-50 dark:bg-default-100 rounded-xl border border-default-200 border border-default-200 p-4 animate-in fade-in slide-in-from-top-2 duration-200 dark:bg-default-200 dark:border-default-200"
      style={{
        top: `${dropdownPos.top}px`,
        right: `${dropdownPos.right}px`,
        zIndex: 2147483647,
        maxWidth: "calc(100vw - 2rem)"
      }}
    >
      <h4 className="font-semibold text-foreground mb-3">Estado de Impresión</h4>

      {/* Descripción del estado actual */}
      <div className="mb-3 p-2 bg-default-50 rounded-lg text-xs text-default-600 dark:bg-default-200 dark:text-default-400">
        {getStatusDescription()}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-default-600">Modo</span>
          <span className={`text-sm font-medium ${
            status.isTauri ? "text-emerald-600" : "text-default-600"
          }`}>
            {status.isTauri ? <span className="flex items-center gap-1"><Monitor className="w-4 h-4" /> Tauri</span> : <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> Web</span>}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-default-600">Estado</span>
          <span className={`text-sm font-medium ${
            !status.isChecked ? "text-default-400" :
            status.isOnline ? "text-emerald-600" : "text-rose-600"
          }`}>
            {!status.isChecked && "Verificando..."}
            {status.isChecked && status.isOnline && <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-600" /> Online</span>}
            {status.isChecked && !status.isOnline && <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-rose-600" /> Offline</span>}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-default-600">Papel</span>
          <span className={`text-sm font-medium ${
            status.paperStatus === "ok" ? "text-emerald-600" :
            status.paperStatus === "low" ? "text-amber-600" :
            status.paperStatus === "out" ? "text-rose-600" :
            "text-default-400"
          }`}>
            {status.paperStatus === "ok" && <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-600" /> OK</span>}
            {status.paperStatus === "low" && <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-600" /> Bajo</span>}
            {status.paperStatus === "out" && <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-rose-600" /> Vacío</span>}
            {status.paperStatus === "unknown" && <span className="flex items-center gap-1"><CircleHelp className="w-4 h-4 text-default-400" /> Desconocido</span>}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-default-600">Trabajos pendientes</span>
          <span className="text-sm font-medium text-foreground">
            {status.queueSize}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-default-600">Último check</span>
          <span className="text-xs text-default-500">
            {status.lastCheck.toLocaleTimeString("es-CO")}
          </span>
        </div>
      </div>

      {status.lastError && (
        <div className="mt-3 p-2 bg-rose-50 rounded-lg text-xs text-rose-700">
          <strong>Error:</strong> {status.lastError}
        </div>
      )}

        <div className="mt-4 pt-3 border-t border-default-100 dark:border-default-200 flex gap-2">
        <button
          onClick={checkPrinterStatus}
          className="flex-1 py-2 px-3 bg-brand-500 hover:bg-brand-600 text-default-50 rounded-lg text-sm font-medium transition-colors border border-default-200"
        >
          Verificar ahora
        </button>
        <button
          onClick={() => setIsExpanded(false)}
          className="py-2 px-3 bg-default-100 hover:bg-default-200 text-default-700 rounded-lg text-sm font-medium transition-colors dark:bg-default-200 dark:text-default-300 dark:hover:bg-gray-600"
        >
          Cerrar
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-default-100 hover:bg-default-200 transition-colors"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${status.isOnline ? "animate-pulse" : ""}`} />
        <span className="text-sm font-medium text-default-700 hidden sm:inline">
          Impresora: {getStatusText()}
        </span>
        <span className="text-sm font-medium text-default-700 sm:hidden">
          {getStatusText()}
        </span>
        {status.queueSize > 0 && (
          <span className="ml-1 bg-brand-500 text-default-50 text-xs px-2 py-0.5 rounded-full">
            {status.queueSize}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-default-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)
      }
    </div>
  );
}
