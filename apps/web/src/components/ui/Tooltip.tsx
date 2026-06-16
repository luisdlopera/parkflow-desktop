import React from "react";
import { Tooltip as HeroTooltip, TooltipProps as HeroTooltipProps } from "@heroui/react";

export interface TooltipProps extends Omit<HeroTooltipProps, "content"> {
  content?: React.ReactNode;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, ...props }, ref) => {
    return (
      <HeroTooltip {...props as any}>
        <span
          role="button"
          tabIndex={0}
          className="cursor-help"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
            }
          }}
        >
          {children}
        </span>
        <HeroTooltip.Content>
          {content}
        </HeroTooltip.Content>
      </HeroTooltip>
    );
  }
);
Tooltip.displayName = "Tooltip";
