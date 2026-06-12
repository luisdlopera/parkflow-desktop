import React from "react";
import {
  TextField,
  Label,
  TextArea as HeroTextArea,
  Description,
  FieldError,
  TextAreaProps as HeroTextAreaProps,
} from "@heroui/react";

export interface TextAreaProps extends Omit<HeroTextAreaProps, "size" | "color" | "variant" | "radius" | "classNames" | "minRows" | "maxRows" | "className"> {
  label?: string;
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
  minRows?: number;
  maxRows?: number;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, description, errorMessage, isInvalid, isRequired, className, classNames, minRows, maxRows, size, color, variant, radius, ...props }, ref) => {
    return (
      <TextField isInvalid={isInvalid} isRequired={isRequired} className={className as any}>
        {label && <Label>{label}</Label>}
        <HeroTextArea ref={ref} rows={minRows} {...props as any} />
        {description && !isInvalid && <Description>{description}</Description>}
        {errorMessage && isInvalid && <FieldError>{errorMessage}</FieldError>}
      </TextField>
    );
  }
);

TextArea.displayName = "TextArea";
