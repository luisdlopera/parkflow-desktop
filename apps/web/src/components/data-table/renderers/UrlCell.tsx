import React from "react";
import { Link } from "@heroui/react";
import { ExternalLink } from "lucide-react";
import { CellRendererProps } from "../types";

/**
 * UrlCell — Renderiza un link a una URL externa con icono.
 */
const UrlCell: React.FC<CellRendererProps> = ({ value }) => {
  if (!value) return <span className="text-default-400 select-none">−</span>;

  const url = String(value);
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary text-sm hover:underline truncate max-w-[200px]"
      aria-label={`Abrir enlace en nueva pestaña: ${url}`}
    >
      <ExternalLink className="size-4 flex-shrink-0" aria-hidden="true" />
      {url}
    </Link>
  );
};

export default UrlCell;
