import React from "react";
import { CellRendererProps, CustomOptions } from "../types";

/**
 * CustomCell — Permite renderizado completamente libre vía función.
 * Opciones: render(value, row) => ReactNode.
 */
const CustomCell: React.FC<CellRendererProps> = ({ value, row, column }) => {
  const opts = (column.options ?? {}) as CustomOptions;

  if (!opts.render || typeof opts.render !== "function") {
    return <span className="text-danger-500">Custom render function missing</span>;
  }

  // Prevent infinite recursion if the custom render returns something that matches a type
  return <>{opts.render(value, row)}</>;
};

export default CustomCell;
