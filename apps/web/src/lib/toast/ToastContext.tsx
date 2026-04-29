"use client";

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number, action?: { label: string; onClick: () => void }) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((
    message: string, 
    type: ToastType, 
    duration = 5000,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = `toast-${++idCounter.current}-${Date.now()}`;
    const toast: Toast = { id, message, type, duration, action };
    
    setToasts((prev) => [...prev, toast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => {
    addToast(message, "success", duration ?? 4000);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast(message, "error", duration ?? 6000);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast(message, "warning", duration ?? 5000);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast(message, "info", duration ?? 4000);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove}
          index={index}
        />
      ))}
    </div>
  );
}

// Individual Toast Item
function ToastItem({ 
  toast, 
  onRemove, 
  index 
}: { 
  toast: Toast; 
  onRemove: (id: string) => void;
  index: number;
}) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  const styles = {
    success: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
    error: "bg-rose-500 text-white shadow-lg shadow-rose-500/30",
    warning: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
    info: "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
  };

  return (
    <div
      className={`
        pointer-events-auto
        flex items-start gap-3 min-w-[320px] max-w-md
        ${styles[toast.type]}
        rounded-xl px-4 py-3
        transform transition-all duration-300 ease-out
        ${isLeaving ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
      `}
      style={{
        animation: isLeaving ? undefined : "slide-in-right 0.3s ease-out",
        marginTop: index > 0 ? "0.5rem" : undefined
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed">
          {toast.message}
        </p>
        
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleRemove();
            }}
            className="mt-2 text-xs font-semibold underline underline-offset-2 hover:opacity-80"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleRemove}
        className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
        aria-label="Cerrar notificación"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
