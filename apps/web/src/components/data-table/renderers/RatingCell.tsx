import React from "react";
import { Star } from "lucide-react";
import { CellRendererProps } from "../types";

/**
 * RatingCell — Renderiza estrellas de rating.
 * value: número entre 0 y 5 (o maxStars configurable).
 */
const RatingCell: React.FC<CellRendererProps> = ({ value }) => {
  const maxStars = Number((value as any)?.maxStars) || 5;
  const rating = Number(value) || 0;
  const displayRating = Math.min(Math.max(rating, 0), maxStars);
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1" aria-label={`Rating: ${displayRating} de ${maxStars} estrellas`}>
      {Array.from({ length: maxStars }).map((_, idx) => (
        <Star
          key={idx}
          className={`size-4 ${
            idx < fullStars
              ? "fill-warning text-warning"
              : idx < fullStars + (hasHalfStar ? 1 : 0)
                ? "fill-warning/50 text-warning"
                : "text-default-300"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export default RatingCell;
