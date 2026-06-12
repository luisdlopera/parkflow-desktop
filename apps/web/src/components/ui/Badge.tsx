import React from "react";
import { Badge as HeroBadge, BadgeProps as HeroBadgeProps } from "@heroui/react";

export interface BadgeProps extends Omit<HeroBadgeProps, "color" | "content"> {
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "accent" | string;
  tone?: "success" | "warning" | "neutral" | string; // V2 internal badge compatibility
  label?: string; // V2 internal badge compatibility
  content?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ color, tone, label, content, children, ...props }, ref) => {
    let mappedColor: HeroBadgeProps["color"] = "default";
    
    // Support internal v2 tone
    if (tone === "success") mappedColor = "success";
    else if (tone === "warning") mappedColor = "warning";
    else if (tone === "neutral") mappedColor = "default";
    else if (color === "success" || color === "warning" || color === "danger" || color === "default") {
      mappedColor = color as HeroBadgeProps["color"];
    } else if (color === "primary" || color === "secondary" || color === "accent") {
      mappedColor = "danger"; // Accent not supported, map to danger or default
    }

    // Support internal v2 label
    const innerContent = label || content || children;

    return <HeroBadge ref={ref} color={mappedColor} content={content as any} {...props}>{innerContent}</HeroBadge>;
  }
);
Badge.displayName = "Badge";

export default Badge;
