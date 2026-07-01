import React from "react";
import { CellRendererProps } from "../types";

/**
 * ProgressCell — Renderiza una barra de progreso visual.
 * value: número entre 0 y 1, o entre 0 y 100 (percent=true).
 */
const ProgressCell: React.FC<CellRendererProps> = ({ value }) => {
  let progress = 0;

  if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
    progress = Number(value);
    // Assume 0-1 range, convert to percentage if needed
    if (progress <= 1 && progress >= 0) {
      progress = Math.round(progress * 100);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-full h-2 bg-default-200 rounded-full overflow-hidden max-w-[100px]">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label="Progreso"
        />
      </div>
      <span className="text-xs text-default-500 w-8">{progress}%</span>
    </div>
  );
};

export default ProgressCell;
