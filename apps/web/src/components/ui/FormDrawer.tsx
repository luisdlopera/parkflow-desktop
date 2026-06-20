"use client";

import { useEffect } from "react";

type FormDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
};

export function FormDrawer({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  children,
  loading,
  error
}: FormDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end sm:items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} role="presentation" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} />
      <div className="relative z-10 flex h-auto sm:h-full w-full sm:max-w-lg max-h-[90vh] sm:max-h-none flex-col bg-white border border-default-200 dark:bg-gray-900 dark:border border-default-200 rounded-t-2xl sm:rounded-none">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-4">{children}</div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-gray-800/50 fixed bottom-0 sm:relative left-0 right-0 sm:left-auto sm:right-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 sm:py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-gray-800 min-h-11 sm:min-h-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => { void onSubmit(); }}
            className="rounded-lg bg-brand-500 px-4 py-2 sm:py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 min-h-11 sm:min-h-auto sm:w-auto w-full"
          >
            {loading ? "Guardando..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
