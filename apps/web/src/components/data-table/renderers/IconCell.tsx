import React from "react";
import { LucideIcon } from "lucide-react";
import { CellRendererProps } from "../types";

/**
 * IconCell — Renderiza un icono de Lucide basado en el valor.
 * Se espera que el valor sea un nombre de icono (ej: "Car", "User").
 * Puedes usar un mapeo de strings a componentes de Lucide.
 */
const iconMap: Record<string, LucideIcon> = {
  // Ejemplo de mapeo. En una implementación real,
  // importarías los íconos que necesites y los agregarías aquí.
  // "car": Car,
  // "user": User,
  // "truck": Truck,
};

const IconCell: React.FC<CellRendererProps> = ({ value }) => {
  if (!value) return <span className="text-default-400 select-none">−</span>;

  const iconName = String(value);
  const Icon = iconMap[iconName];

  if (!Icon) {
    // Si no encuentra el icono, devuelve el texto del valor
    return <span className="text-foreground">{iconName}</span>;
  }

  return <Icon className="size-5 text-foreground" aria-label={`Icono: ${iconName}`} />;
};

export default IconCell;
