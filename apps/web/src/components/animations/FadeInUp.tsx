"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/animations/utils";

interface FadeInUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * Simple FadeInUp animation component
 * Fade in with subtle upward movement
 */
export function FadeInUp({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
}: FadeInUpProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0.01 }
          : {
              duration,
              delay,
              ease: "easeOut",
            }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
