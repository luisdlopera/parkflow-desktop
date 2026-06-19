import React from "react";
import {
  TextField,
  Label,
  TextArea as HeroTextArea,
  Description,
  FieldError,
  TextAreaProps as HeroTextAreaProps,
} from "@heroui/react";

export interface TextAreaProps extends Omit<HeroTextAreaProps, "size" | "color" | "variant" | "radius" | "classNames" | "minRows" | "maxRows" | "className" | "onValueChange"> {
  label?: string;
  onValueChange?: (value: string) => void;
  description?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  isRequired?: boolean;
  size?: "sm" | "md" | "lg" | (string & {});
  color?: (string & {});
  variant?: "flat" | "bordered" | "faded" | "underlined" | "primary" | "secondary" | (string & {});
  radius?: (string & {});
  classNames?: any;
  className?: any;
  minRows?: number;
  maxRows?: number;
}

/** Default styling: white bg + subtle border for clear contrast against any container */
const TEXTAREA_BASE_CLASS = "bg-[#f4f4f5] border-none dark:bg-zinc-800/60 rounded-xl transition-colors";
const TEXTAREA_BORDERED_CLASS = "bg-transparent border-2 border-default-200 rounded-xl transition-colors";

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, description, errorMessage, isInvalid, isRequired, className, classNames, minRows, maxRows, size, color, variant, radius, value, defaultValue, name, onChange, onBlur, "aria-label": ariaLabel, ...props }, ref) => {
    const textareaClass = variant === "bordered" ? TEXTAREA_BORDERED_CLASS : TEXTAREA_BASE_CLASS;

    const handleValueChange = React.useCallback((val: string) => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: val, name },
          currentTarget: { value: val, name },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
        (onChange as unknown as (e: React.ChangeEvent<HTMLTextAreaElement>) => void)(syntheticEvent);
        if (props.onValueChange) {
          props.onValueChange(val);
        }
      }
    }, [onChange, name]);

    return (
      <TextField 
        isInvalid={isInvalid} 
        isRequired={isRequired} 
        className={className}
        value={value as string}
        defaultValue={defaultValue as string}
        name={name}
        onChange={handleValueChange}
        onBlur={onBlur as unknown as React.FocusEventHandler<HTMLInputElement>}
        aria-label={ariaLabel}
      >
        {label && <Label>{label}</Label>}
        <HeroTextArea ref={ref} rows={minRows} className={textareaClass} {...props} />
        {description && !isInvalid && <Description>{description}</Description>}
        {errorMessage && isInvalid && <FieldError>{errorMessage}</FieldError>}
      </TextField>
    );
  }
);

TextArea.displayName = "TextArea";
