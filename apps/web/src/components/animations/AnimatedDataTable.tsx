"use client";

import { motion } from "framer-motion";
import DataTable, { type DataTableProps } from "@/components/ui/DataTable";
import { containerVariants, itemVariants } from "@/lib/animations/variants";
import { prefersReducedMotion } from "@/lib/animations/utils";

/**
 * AnimatedDataTable wrapper that adds staggered row animations
 * Wraps existing DataTable component with motion enhancements
 *
 * @example
 * <AnimatedDataTable
 *   columns={columns}
 *   data={data}
 *   isLoading={isLoading}
 * />
 */
export function AnimatedDataTable<T extends object>(
  props: DataTableProps<T>
) {
  const reducedMotion = prefersReducedMotion();

  if (reducedMotion) {
    return <DataTable {...props} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      transition={{
        staggerChildren: 0.05,
        delayChildren: 0.1,
      }}
    >
      <DataTable {...props} />
    </motion.div>
  );
}
