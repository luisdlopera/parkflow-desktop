import React from "react";
import { Chip } from "@heroui/react";
import { CellRendererProps } from "../types";

/**
 * BooleanCell — Renderiza Sí/No con Chip de HeroUI.
 */
const BooleanCell: React.FC<CellRendererProps> = ({ value }) => {
  const isActive = Boolean(value);

  return (
    <Chip color={isActive ? "success" : "default"} size="sm" variant="soft">
      {isActive ? "Sí" : "No"}
    </Chip>
  );
};

export default BooleanCell;
