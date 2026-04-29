"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

const typeStyles = {
  success: {
    bg: "bg-emerald-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  error: {
    bg: "bg-rose-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  warning: {
    bg: "bg-amber-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  info: {
    bg: "bg-blue-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
};

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto close
    const closeTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for exit animation
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const styles = typeStyles[type];

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 flex items-center gap-3 
        ${styles.bg} text-white 
        px-4 py-3 rounded-xl shadow-2xl
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      role="alert"
      aria-live="polite"
    >
      {styles.icon}
      <span className="font-medium text-sm">{message}</span>
      <button
        onClick={() => {
          setIsLeaving(true);
          setTimeout(() => onClose?.(), 300);
        }}
        className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Cerrar notificacion"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface SuccessToastProps {
  ticketNumber: string;
  onClose?: () => void;
}

export function SuccessToast({ ticketNumber, onClose }: SuccessToastProps) {
  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm
        animate-in fade-in duration-200
      `}
      onClick={onClose}
    >
      <div
        className="
          bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-sm w-full
          transform scale-100 animate-in zoom-in-95 duration-200
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Ingreso Registrado
          </h3>

          <div className="bg-slate-100 rounded-xl px-6 py-3 mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ticket</p>
            <p className="text-2xl font-mono font-bold text-slate-900">{ticketNumber}</p>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            El ticket ha sido impreso y la talanquera está lista para el siguiente vehículo.
          </p>

          <button
            onClick={onClose}
            className="
              w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold
              py-3 px-6 rounded-xl transition-colors
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
            "
            autoFocus
          >
            Continuar (Enter)
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast container for managing multiple toasts
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}
