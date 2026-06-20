"use client";

import { motion } from "framer-motion";
import { Button, type ButtonProps } from "@heroui/react";
import { prefersReducedMotion } from "@/lib/animations/utils";

interface EnhancedButtonProps extends Omit<ButtonProps, "className"> {
  isLoading?: boolean;
  motionClassName?: string;
}

/**
 * EnhancedButton with hover scale effect and loading spinner
 * Provides premium feel with smooth, snappy interactions
 */
export function EnhancedButton({
  isLoading,
  children,
  motionClassName = "",
  ...props
}: EnhancedButtonProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      whileHover={reducedMotion ? undefined : { scale: 1.02 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={
        reducedMotion
          ? { duration: 0.01 }
          : {
              scale: { duration: 0.2 },
            }
      }
      className={motionClassName}
    >
      <Button
        {...props}
        isDisabled={isLoading || props.isDisabled}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        ) : (
          children
        )}
      </Button>
    </motion.div>
  );
}
