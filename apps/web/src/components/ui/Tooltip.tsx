import React from "react";
import { Tooltip as HeroTooltip, TooltipProps as HeroTooltipProps } from "@heroui/react";

export interface TooltipProps extends Omit<HeroTooltipProps, "content"> {
  content?: React.ReactNode;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, ...props }, ref) => {
    return (
      <HeroTooltip content={content as any} {...props as any}>
        {children}
      </HeroTooltip>
    );
  }
);
Tooltip.displayName = "Tooltip";
