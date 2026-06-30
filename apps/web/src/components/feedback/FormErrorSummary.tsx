"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface FormErrorSummaryProps {
  message?: string;
  className?: string;
  testId?: string;
}

export function FormErrorSummary({ message, className, testId }: FormErrorSummaryProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      data-testid={testId}
      className={`flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 text-danger-700 animate-in fade-in slide-in-from-top-1 duration-200 ${className ?? ""}`}
    >
      <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold">Error en el formulario</span>
        <span className="text-sm leading-relaxed">{message}</span>
      </div>
    </div>
  );
}
