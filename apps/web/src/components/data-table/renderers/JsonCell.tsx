import React, { useState } from "react";
import { Button, Tooltip } from "@heroui/react";
import { CellRendererProps, JsonOptions } from "../types";

/**
 * JsonCell — Renderiza JSON formateado con opción de colapsar/expandir.
 * Opciones: collapsed, maxLength, pretty.
 */
const JsonCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as JsonOptions;
  const { collapsed = true, maxLength = 100, pretty = true } = opts;

  const [isExpanded, setIsExpanded] = useState(!collapsed);

  if (value === null || value === undefined) {
    return <span className="text-default-400 select-none">−</span>;
  }

  let jsonStr: string;
  try {
    const obj = typeof value === "string" ? JSON.parse(value) : value;
    jsonStr = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  } catch {
    return <span className="text-danger-500 text-xs">Invalid JSON</span>;
  }

  const isTruncated = jsonStr.length > maxLength && !isExpanded;
  const display = isTruncated ? jsonStr.slice(0, maxLength) + "..." : jsonStr;

  return (
    <div className="font-mono text-xs text-default-600 max-w-xs">
      <pre className="whitespace-pre-wrap break-all bg-default-50 p-2 rounded-lg border border-default-200">
        {display}
      </pre>
      {jsonStr.length > maxLength && (
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-xs text-primary"
        >
          {isExpanded ? "Ver menos" : "Ver más"}
        </Button>
      )}
    </div>
  );
};

export default JsonCell;
