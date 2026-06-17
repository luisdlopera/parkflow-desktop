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
    // Separate variant and color mapping
    let mappedVariant: any = "solid";
    let mappedColor: any = color || "primary";

    // Map variant (styling/presentation)
    if (variant === "ghost" || variant === "light" || variant === "flat") {
      mappedVariant = "ghost";
    } else if (variant === "bordered" || variant === "faded" || variant === "outline") {
      mappedVariant = "outline";
    } else if (variant === "tertiary") {
      mappedVariant = "tertiary";
    } else if (!variant || variant === "solid" || variant === "primary") {
      mappedVariant = "solid";
    }

    // Map color (only if explicitly set in color or variant prop)
    if (color === "danger" || variant === "danger") {
      mappedColor = "danger";
    } else if (color === "warning" || variant === "warning") {
      mappedColor = "warning";
    } else if (color === "secondary" || variant === "secondary") {
      mappedColor = "secondary";
    } else if (color === "success" || variant === "success") {
      mappedColor = "success";
    } else if (color === "default" || variant === "default") {
      mappedColor = "default";
    }

    return (
      <HeroButton
        ref={ref}
        variant={mappedVariant}
        color={mappedColor as any}
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
