import React from "react";
import {
  TextField,
  Label,
  Input as HeroInput,
  Description,
  FieldError,
  InputGroup,
  CloseButton,
  InputProps as HeroInputProps,
} from "@heroui/react";

export interface InputProps extends Omit<HeroInputProps, "size" | "color" | "variant" | "radius" | "classNames" | "isDisabled" | "className"> {
  label?: React.ReactNode;
  description?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  isRequired?: boolean;
  size?: "sm" | "md" | "lg" | string;
  color?: string;
  variant?: "flat" | "bordered" | "faded" | "underlined" | "primary" | "secondary" | string;
  radius?: string;
  classNames?: any;
  className?: any;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isClearable?: boolean;
  onClear?: () => void;
  isDisabled?: boolean;
  disabled?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, errorMessage, isInvalid, isRequired, className, startContent, endContent, classNames, isClearable, onClear, size, color, variant, radius, isDisabled, disabled, ...props }, ref) => {
    const uniqueId = React.useId();
    const inputId = props.id || uniqueId;
    return (
      <TextField isInvalid={isInvalid} isRequired={isRequired} className={className as any} isDisabled={isDisabled || disabled}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        
        {startContent || endContent || isClearable ? (
          <InputGroup className={variant === "bordered" ? "bg-transparent border-2 border-default-200" : "bg-default-100 rounded-lg"}>
            {startContent && <InputGroup.Prefix>{startContent}</InputGroup.Prefix>}
            <InputGroup.Input ref={ref as any} id={inputId} {...props as any} />
            {isClearable && props.value && onClear && (
               <CloseButton aria-label="Clear" onPress={onClear} />
            )}
            {endContent && <InputGroup.Suffix>{endContent}</InputGroup.Suffix>}
          </InputGroup>
        ) : (
          <HeroInput ref={ref as any} id={inputId} className={variant === "bordered" ? "bg-transparent border-2 border-default-200" : "bg-default-100 rounded-lg"} {...props as any} />
        )}
        
        {description && !isInvalid && <Description>{description}</Description>}
        {errorMessage && isInvalid && <FieldError>{errorMessage}</FieldError>}
      </TextField>
    );
  }
);

Input.displayName = "Input";
