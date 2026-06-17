import React from "react";
import { Button as HeroButton } from "@heroui/react";

export interface ButtonProps {
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "border border-default-200" | "ghost" | "primary" | "secondary" | "tertiary" | "outline" | "danger" | (string & {});
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | (string & {});
  isLoading?: boolean;
  isDisabled?: boolean;
  isIconOnly?: boolean;
  disabled?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  as?: any;
  href?: string;
  fullWidth?: boolean;
  children?: React.ReactNode | ((renderProps: any) => React.ReactNode);
  onPress?: () => void;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg" | (string & {});
  type?: "button" | "submit" | "reset";
  form?: string;
  id?: string;
  name?: string;
  value?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: boolean;
  "aria-controls"?: string;
  "data-testid"?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, color, isLoading, isDisabled, disabled, startContent, endContent, children, fullWidth, ...props }, ref) => {
    // Determine button color - default to primary (orange)
    const buttonColor = color || "primary";

    // Determine variant - preserve explicit variants, use "solid" for color-based buttons
    let mappedVariant = variant;

    if (!variant || (variant !== "ghost" && variant !== "light" && variant !== "flat" &&
        variant !== "bordered" && variant !== "faded" && variant !== "outline" && variant !== "tertiary")) {
      // If no variant or using color-based variant names, map to solid
      if (variant === "danger" || variant === "warning" || variant === "secondary" ||
          variant === "success" || variant === "primary") {
        mappedVariant = "solid";
      } else if (!variant) {
        mappedVariant = "solid";
      }
    }

    return (
      <HeroButton
        ref={ref}
        variant={mappedVariant || "solid"}
        color={buttonColor}
        isPending={isLoading}
        isDisabled={isDisabled || disabled}
        className={fullWidth ? `w-full ${props.className || ""}` : props.className}
        {...props as any}
      >
        {startContent}
        {children}
        {endContent}
      </HeroButton>
    );
  }
);
Button.displayName = "Button";
