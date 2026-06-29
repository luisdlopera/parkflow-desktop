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
  ({ variant, color, isLoading, isDisabled, disabled, startContent, endContent, children, fullWidth, className, size, onPress, onClick, isIconOnly, "aria-label": ariaLabel, ...props }, ref) => {
    // Separate variant and color mapping
    let mappedVariant: any = "solid";
    let mappedColor: any = color || "primary";
    let colorClasses = "";

    // Improved padding for different sizes (better mobile UX, min 44px height)
    let sizeClasses = "";
    if (size === "lg") {
      sizeClasses = "py-3 px-6 min-h-12";
    } else if (size === "md") {
      sizeClasses = "py-2.5 px-5 min-h-11";
    } else if (size === "sm") {
      sizeClasses = "py-2 px-4 min-h-11";
    }

    // Map variant (styling/presentation)
    if (variant === "ghost" || variant === "light" || variant === "flat") {
      mappedVariant = "ghost";
    } else if (variant === "bordered" || variant === "faded" || variant === "outline") {
      mappedVariant = "outline";
      // Add hover state for outline buttons if not already in colorClasses
      if (!colorClasses) {
        colorClasses = "hover:bg-default-100 dark:hover:bg-default-800 hover:border-default-400 dark:hover:border-default-600 transition-all duration-200";
      }
    } else if (variant === "tertiary") {
      mappedVariant = "tertiary";
    } else if (!variant || variant === "solid" || variant === "primary") {
      mappedVariant = "solid";
    }

    // Map color (only if explicitly set in color or variant prop)
    if (color === "danger" || variant === "danger") {
      mappedColor = "danger";
      colorClasses = "bg-red-600 text-default-50 hover:bg-red-700";
    } else if (color === "warning" || variant === "warning") {
      mappedColor = "warning";
      colorClasses = "bg-yellow-600 text-default-50 hover:bg-yellow-700";
    } else if (color === "secondary" || variant === "secondary") {
      mappedColor = "secondary";
      colorClasses = "bg-default-600 text-default-50 hover:bg-default-700";
    } else if (color === "success" || variant === "success") {
      mappedColor = "success";
      colorClasses = "bg-green-600 text-default-50 hover:bg-green-700";
    } else if (color === "default" || variant === "default") {
      mappedColor = "default";
      colorClasses = "bg-default-200 text-foreground hover:bg-default-300 hover:border-default-400 transition-all duration-200";
    } else if (variant === "tertiary") {
      mappedColor = "default";
      colorClasses = ""; // let className prop control all styling
    } else {
      // Default to primary brand color
      mappedColor = "primary";
      colorClasses = "bg-brand-500 text-default-50 hover:bg-brand-600";
    }

    return (
      <HeroButton
        ref={ref}
        variant={mappedVariant}
        isPending={isLoading}
        isDisabled={isDisabled || disabled}
        size={size}
        isIconOnly={isIconOnly}
        className={`${colorClasses} ${sizeClasses} ${fullWidth ? "w-full" : ""} ${className || ""}`.trim()}
        onPress={onPress}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-disabled={isDisabled || disabled}
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
