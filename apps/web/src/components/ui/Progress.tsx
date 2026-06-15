import React from "react";
import { ProgressBar as HeroProgress, ProgressBarProps as HeroProgressProps } from "@heroui/react";

export interface ProgressProps extends Omit<HeroProgressProps, "showValueLabel" | "color"> {
  showValueLabel?: boolean;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "accent" | (string & {});
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ showValueLabel, color, ...props }, ref) => {
    let mappedColor: any = color;
    if (color === "primary") mappedColor = "default";
    return <HeroProgress ref={ref} color={mappedColor} valueLabel={showValueLabel ? undefined : props.valueLabel} {...props as any} />;
  }
);
Progress.displayName = "Progress";
