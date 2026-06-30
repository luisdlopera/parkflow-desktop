import React from "react";
import { Chip } from "@/components/bridge/Chip";
import { CellRendererProps, MultiRelationOptions } from "../types";

/**
 * MultiRelationCell — Renderiza un array de relaciones como chips.
 * Opciones: labelKey (default "name"), maxVisible (default 3).
 */
const MultiRelationCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const emptyText = column.options?.emptyText ?? "−";
  const { labelKey = "name", maxVisible = 3 } = (column.options as MultiRelationOptions) ?? {};

  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-default-400 select-none">{emptyText}</span>;
  }

  const visible = value.slice(0, maxVisible);
  const hidden = value.length - maxVisible;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((item, idx) => {
        const label = typeof item === "string" ? item : (item as any)?.[labelKey] ?? emptyText;
        return (
          <Chip key={idx} color="primary" size="sm" variant="soft" aria-label={`Relación: ${label}`}>
            {label}
          </Chip>
        );
      })}
      {hidden > 0 && (
        <span className="text-xs text-default-400">+{hidden}</span>
      )}
    </div>
  );
};

export default MultiRelationCell;
