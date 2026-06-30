import React from "react";
import { CellRendererProps, ColorOptions } from "../types";

/**
 * ColorCell — Renderiza un swatch de color con hexadecimal opcional.
 * Opciones: showHex, shape.
 */
const ColorCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as ColorOptions;
  const { showHex = false, shape = "circle" } = opts;

  if (!value) {
    return <span className="text-default-400 select-none">−</span>;
  }

  const colorStr = String(value);
  // Validate hex color
  const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorStr);
  if (!isValidHex) {
    return <span className="text-danger-500 text-xs">Invalid color</span>;
  }

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 border border-default-200 ${shapeClass}`}
        style={{ backgroundColor: colorStr }}
        aria-label={`Color: ${colorStr}`}
      />
      {showHex && (
        <span className="text-xs font-mono text-default-500 uppercase">
          {colorStr}
        </span>
      )}
    </div>
  );
};

export default ColorCell;
