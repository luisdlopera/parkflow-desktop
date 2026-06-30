import React from "react";
import { Chip } from "@heroui/react";
import { CellRendererProps, TagsOptions } from "../types";

/**
 * TagsCell — Renderiza un array de etiquetas como Chips.
 * Opciones: maxVisible, colorMap, labelMap.
 */
const TagsCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as TagsOptions;
  const { maxVisible = 3, colorMap, labelMap } = opts;

  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-default-400 select-none">−</span>;
  }

  // Default color rotation for tags
  const defaultColors = ["primary", "success", "warning", "danger", "default"] as const;

  const visible = value.slice(0, maxVisible);
  const hidden = value.length - maxVisible;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag, idx) => {
        const tagValue = String(tag);
        const label = labelMap?.[tagValue] ?? tagValue;
        const color = (colorMap?.[tagValue] ?? defaultColors[idx % defaultColors.length]) as any;

        return (
          <Chip key={`${tagValue}-${idx}`} color={color} size="sm" variant="soft">
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

export default TagsCell;
