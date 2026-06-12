import React from "react";
import { Alert as HeroAlert } from "@heroui/react";

/** Maps legacy "color" values to HeroUI v3 "status" values. */
function mapColorToStatus(
  color?: string
): "default" | "accent" | "success" | "warning" | "danger" {
  if (!color) return "default";
  if (color === "success" || color === "warning" || color === "danger")
    return color;
  if (color === "primary" || color === "accent") return "accent";
  return "default";
}

export interface AlertProps {
  /** Legacy v2 `color` — maps to v3 `status`. */
  color?: string;
  /** Ignored in v3 — kept for backwards-compat. */
  variant?: string;
  /** Whether to hide the indicator icon. */
  hideIcon?: boolean;
  /** Description text rendered below the title / children. */
  description?: React.ReactNode;
  /** Extra content rendered at the end of the alert (e.g. action buttons). */
  endContent?: React.ReactNode;
  /** Main content — treated as the alert title. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Alert wrapper that exposes a convenience props-based API
 * (v2-style) while rendering HeroUI v3 compound components internally.
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ color, hideIcon, description, endContent, children, className, ...props }, ref) => {
    const status = mapColorToStatus(color);

    return (
      <HeroAlert ref={ref} status={status} className={className} data-slot="alert-root" color={color} {...(props as Record<string, unknown>)}>
        {!hideIcon && <HeroAlert.Indicator />}
        <HeroAlert.Content>
          {children && <HeroAlert.Title>{children}</HeroAlert.Title>}
          {description && (
            <HeroAlert.Description>{description}</HeroAlert.Description>
          )}
        </HeroAlert.Content>
        {endContent}
      </HeroAlert>
    );
  }
);
Alert.displayName = "Alert";
