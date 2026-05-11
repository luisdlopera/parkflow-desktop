"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FormErrorSummaryProps {
  message?: string;
  className?: string;
  testId?: string;
}

export function FormErrorSummary({ message, className, testId }: FormErrorSummaryProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          data-testid={testId}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 text-danger-700 shadow-sm ${className}`}
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Error en el formulario</span>
            <span className="text-sm leading-relaxed">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
