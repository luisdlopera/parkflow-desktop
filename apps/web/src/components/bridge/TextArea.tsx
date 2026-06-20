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
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}

/** Default styling: white bg + subtle border for clear contrast against any container */
const TEXTAREA_BASE_CLASS = "bg-[#f4f4f5] border-none dark:bg-zinc-800/60 rounded-xl transition-colors focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-zinc-900";
const TEXTAREA_BORDERED_CLASS = "bg-transparent border-2 border-default-200 rounded-xl transition-colors focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-zinc-900";

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, description, errorMessage, isInvalid, isRequired, className, classNames, minRows, maxRows, size, color, variant, radius, value, defaultValue, name, onChange, onBlur, "aria-label": ariaLabel, "aria-describedby": ariaDescribedby, "aria-required": ariaRequired, ...props }, ref) => {
    const uniqueId = React.useId();
    const textareaId = (props as any).id || uniqueId;
    const errorId = `${textareaId}-error`;
    const descriptionId = `${textareaId}-description`;
    const textareaClass = variant === "bordered" ? TEXTAREA_BORDERED_CLASS : TEXTAREA_BASE_CLASS;

    // Combine aria-describedby for error and description
    const combinedAriaDescribedby = [
      ariaDescribedby,
      isInvalid && errorMessage ? errorId : null,
      description && !isInvalid ? descriptionId : null,
    ]
      .filter(Boolean)
      .join(" ");

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
        {label && <Label htmlFor={textareaId}>{label}</Label>}
        <HeroTextArea
          ref={ref}
          id={textareaId}
          rows={minRows}
          className={textareaClass}
          aria-invalid={isInvalid}
          aria-required={ariaRequired ?? isRequired}
          aria-describedby={combinedAriaDescribedby || undefined}
          {...props}
        />
        {description && !isInvalid && <Description id={descriptionId}>{description}</Description>}
        {errorMessage && isInvalid && <FieldError id={errorId}>{errorMessage}</FieldError>}
      </TextField>
    );
  }
);

TextArea.displayName = "TextArea";
