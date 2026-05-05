"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InlineFieldErrorProps {
  message?: string;
}

export function InlineFieldError({ message }: InlineFieldErrorProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="mt-1.5 text-xs font-medium text-danger"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
