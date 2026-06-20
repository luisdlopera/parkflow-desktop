"use client";

import { motion, AnimatePresence } from "framer-motion";
import { modalBackdropVariants, modalContentVariants } from "@/lib/animations/variants";
import { prefersReducedMotion } from "@/lib/animations/utils";

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * AnimatedModal wrapper with backdrop fade + content bounce animation
 * Provides professional modal entrance/exit animations
 */
export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className = "",
}: AnimatedModalProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
            transition={
              reducedMotion
                ? { duration: 0.01 }
                : { duration: 0.2 }
            }
          />
          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 ${className}`}
            transition={
              reducedMotion
                ? { duration: 0.01 }
                : {
                    duration: 0.3,
                    ease: [0.34, 1.56, 0.64, 1],
                  }
            }
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
