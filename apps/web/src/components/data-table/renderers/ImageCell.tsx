import React from "react";
import { Avatar } from "@heroui/react";
import { CellRendererProps, ImageOptions } from "../types";

/**
 * ImageCell — Renderiza una imagen o avatar con fallback.
 * Opciones: size, rounded, fallback.
 */
const ImageCell: React.FC<CellRendererProps> = ({ value, column }) => {
  const opts = (column.options ?? {}) as ImageOptions;
  const { size = 48, rounded = true, fallback = "—" } = opts;

  if (!value) {
    return <span className="text-default-400 select-none">{fallback}</span>;
  }

  const sizeClass = typeof size === "number" ? `size-[${size}px]` : size;

  return (
    <Avatar
      className={`${sizeClass} ${rounded ? "rounded-full" : "rounded-lg"}`}
    >
      <Avatar.Image
        src={String(value)}
        alt="Imagen"
        className={rounded ? "rounded-full" : "rounded-lg"}
      />
      <Avatar.Fallback>{fallback}</Avatar.Fallback>
    </Avatar>
  );
};

export default ImageCell;
