import React, { useState } from "react";
import { Button, Tooltip } from "@heroui/react";
import { Copy, Check } from "lucide-react";
import { CellRendererProps, CopyableOptions } from "../types";

/**
 * CopyableCell — Muestra un valor con botón para copiar al portapapeles.
 * Opciones: copyValue, toastMessage.
 */
const CopyableCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as CopyableOptions;
  const { toastMessage = "Copiado al portapapeles" } = opts;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="truncate">{String(value)}</span>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={handleCopy}
        aria-label={copied ? "Copiado!" : "Copiar"}
      >
        {copied ? (
          <Check className="size-4 text-success" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  );
};

export default CopyableCell;
