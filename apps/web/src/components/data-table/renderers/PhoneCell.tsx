import React from "react";
import { Link } from "@heroui/react";
import { Phone } from "lucide-react";
import { CellRendererProps } from "../types";

/**
 * PhoneCell — Renderiza un teléfono como callto: link con icono.
 */
const PhoneCell: React.FC<CellRendererProps> = ({ value }) => {
  if (!value) return <span className="text-default-400 select-none">−</span>;

  const phone = String(value);
  return (
    <Link
      href={`tel:${phone}`}
      className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
      aria-label={`Llamar a ${phone}`}
    >
      <Phone className="size-4" aria-hidden="true" />
      {phone}
    </Link>
  );
};

export default PhoneCell;
