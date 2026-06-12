import React from "react";
import { Button as HeroButton, ButtonProps as HeroButtonProps, Spinner } from "@heroui/react";

export interface ButtonProps extends Omit<HeroButtonProps, "variant" | "color" | "isLoading" | "isDisabled"> {
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost" | "primary" | "secondary" | "tertiary" | "outline" | "danger" | string;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | string;
  isLoading?: boolean;
  isDisabled?: boolean;
  disabled?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  as?: any;
  href?: string;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, color, isLoading, isDisabled, disabled, startContent, endContent, children, fullWidth, ...props }, ref) => {
    // Map v2 color/variant to v3 variant
    let mappedVariant: HeroButtonProps["variant"] = "primary";
    
    if (color === "danger" || variant === "danger") mappedVariant = "danger";
    else if (color === "secondary" || variant === "secondary") mappedVariant = "secondary";
    else if (variant === "ghost" || variant === "light" || variant === "flat") mappedVariant = "ghost";
    else if (variant === "bordered" || variant === "faded" || variant === "outline") mappedVariant = "outline";
    else if (color === "default" || variant === "tertiary") mappedVariant = "tertiary";
    
    return (
      <HeroButton 
        ref={ref} 
        variant={mappedVariant} 
        isPending={isLoading}
        isDisabled={isDisabled || disabled}
        className={fullWidth ? `w-full ${props.className || ""}` : props.className}
        {...props as any} 
      >
        {typeof children === "function" ? (
          children
        ) : (
          (renderProps: any) => {
            const { isPending } = renderProps;
            return (
              <>
                {isPending && <Spinner color="current" size="sm" />}
                {startContent}
                {children}
                {endContent}
              </>
            );
          }
        )}
      </HeroButton>
    );
  }
);

Button.displayName = "Button";
