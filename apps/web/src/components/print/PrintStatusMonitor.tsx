"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast/ToastContext";

interface PrinterStatus {
  isOnline: boolean;
  paperStatus: "ok" | "low" | "out" | "unknown";
  lastCheck: Date;
  queueSize: number;
  lastError?: string;
}

export function PrintStatusMonitor() {
  const [status, setStatus] = useState<PrinterStatus>({
    isOnline: true,
    paperStatus: "unknown",
    lastCheck: new Date(),
    queueSize: 0
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAlerted, setHasAlerted] = useState(false);
  const { warning, error, success } = useToast();

  const checkPrinterStatus = useCallback(async () => {
    try {
      // Verificar si estamos en Tauri
      if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
        setStatus(prev => ({
          ...prev,
          isOnline: true, // Asumir online si no es Tauri
          lastCheck: new Date()
        }));
        return;
      }

      const { invoke } = await import("@tauri-apps/api/core");
      
      // Llamar al comando de health check de la impresora
      const result = await invoke<{
        online: boolean;
        paper: "ok" | "low" | "out" | "unknown";
        queue_size: number;
        error?: string;
      }>("printer_health_esc_pos");

      setStatus({
        isOnline: result.online,
        paperStatus: result.paper,
        lastCheck: new Date(),
        queueSize: result.queue_size,
        lastError: result.error
      });

      // Alertar solo una vez por problema
      if (!result.online && !hasAlerted) {
        error("Impresora desconectada. Verifique conexión USB/Red.");
        setHasAlerted(true);
      } else if (result.online && hasAlerted) {
        success("Impresora reconectada correctamente.");
        setHasAlerted(false);
      }

      if (result.paper === "out" && !hasAlerted) {
        error("¡Sin papel! La impresora necesita recarga.");
        setHasAlerted(true);
      } else if (result.paper === "low" && !hasAlerted) {
        warning("Papel bajo. Considere recargar pronto.");
        setHasAlerted(true);
      }

    } catch {
      // Silenciar errores de check - la impresión intentará de todos modos
      setStatus(prev => ({
        ...prev,
        isOnline: true,
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
    if (!status.isOnline) return "bg-rose-500";
    if (status.paperStatus === "out") return "bg-rose-500";
    if (status.paperStatus === "low") return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStatusText = () => {
    if (!status.isOnline) return "Desconectada";
    if (status.paperStatus === "out") return "Sin papel";
    if (status.paperStatus === "low") return "Papel bajo";
    if (status.paperStatus === "ok") return "Lista";
    return "Online";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${status.isOnline ? "animate-pulse" : ""}`} />
        <span className="text-sm font-medium text-slate-700">
          Impresora: {getStatusText()}
        </span>
        {status.queueSize > 0 && (
          <span className="ml-1 bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
            {status.queueSize} pendientes
          </span>
        )}
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <h4 className="font-semibold text-slate-900 mb-3">Estado del Sistema de Impresión</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Estado</span>
              <span className={`text-sm font-medium ${
                status.isOnline ? "text-emerald-600" : "text-rose-600"
              }`}>
                {status.isOnline ? "🟢 Online" : "🔴 Offline"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Papel</span>
              <span className={`text-sm font-medium ${
                status.paperStatus === "ok" ? "text-emerald-600" :
                status.paperStatus === "low" ? "text-amber-600" :
                status.paperStatus === "out" ? "text-rose-600" :
                "text-slate-400"
              }`}>
                {status.paperStatus === "ok" && "✅ OK"}
                {status.paperStatus === "low" && "⚠️ Bajo"}
                {status.paperStatus === "out" && "❌ Vacío"}
                {status.paperStatus === "unknown" && "❓ Desconocido"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Trabajos pendientes</span>
              <span className="text-sm font-medium text-slate-900">
                {status.queueSize}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Último check</span>
              <span className="text-xs text-slate-500">
                {status.lastCheck.toLocaleTimeString("es-CO")}
              </span>
            </div>
          </div>

          {status.lastError && (
            <div className="mt-3 p-2 bg-rose-50 rounded-lg text-xs text-rose-700">
              <strong>Error:</strong> {status.lastError}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
            <button
              onClick={checkPrinterStatus}
              className="flex-1 py-2 px-3 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-lg text-sm font-medium transition-colors"
            >
              Verificar ahora
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
