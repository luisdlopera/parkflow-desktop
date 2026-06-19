import React from "react";
import { Chip as HeroChip, ChipProps as HeroChipProps } from "@heroui/react";

export interface ChipProps extends Omit<HeroChipProps, "color"> {
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "accent" | (string & {});
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ color, ...props }, ref) => {
    let mappedColor: HeroChipProps["color"] = "default";
    
    if (color === "success" || color === "warning" || color === "danger" || color === "default") {
      mappedColor = color as HeroChipProps["color"];
    } else if (color === "primary" || color === "secondary" || color === "accent") {
      mappedColor = "danger"; // Accent/Primary mapped to danger for now, or you can pick default
    }

    return <HeroChip ref={ref} color={mappedColor} {...props} />;
  }
);
Chip.displayName = "Chip";
