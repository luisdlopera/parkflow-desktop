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

export interface InputProps extends Omit<HeroInputProps, "size" | "color" | "variant" | "radius" | "classNames" | "isDisabled" | "className" | "onValueChange"> {
  label?: React.ReactNode;
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
  className?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isClearable?: boolean;
  onClear?: () => void;
  isDisabled?: boolean;
  disabled?: boolean;
}

/** Default styling: white bg + subtle border for clear contrast against any container */
const INPUT_BASE_CLASS = "bg-[#f4f4f5] text-slate-900 border-none dark:bg-zinc-800/60 dark:text-white rounded-xl transition-colors";
const INPUT_BORDERED_CLASS = "bg-transparent text-slate-900 border-2 border-default-200 rounded-xl transition-colors dark:text-white";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, errorMessage, isInvalid, isRequired, className, classNames, startContent, endContent, isClearable, onClear, size, color, variant, radius, isDisabled, disabled, value, defaultValue, name, onChange, onBlur, "aria-label": ariaLabel, ...props }, ref) => {
    const uniqueId = React.useId();
    const inputId = props.id || uniqueId;
    const inputClass = variant === "bordered" ? INPUT_BORDERED_CLASS : INPUT_BASE_CLASS;

    const handleValueChange = React.useCallback((val: string) => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: val, name },
          currentTarget: { value: val, name },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        (onChange as unknown as (e: React.ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
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
        isDisabled={isDisabled || disabled}
        value={value as string}
        defaultValue={defaultValue as string}
        name={name}
        onChange={handleValueChange}
        onBlur={onBlur}
        aria-label={ariaLabel}
      >
        {label && <Label htmlFor={inputId}>{label}</Label>}
        
        {startContent || endContent || isClearable ? (
          <InputGroup className={inputClass}>
            {startContent && <InputGroup.Prefix>{startContent}</InputGroup.Prefix>}
            <InputGroup.Input ref={ref} id={inputId} {...props} />
            {isClearable && value && onClear && (
               <CloseButton aria-label="Clear" onPress={onClear} />
            )}
            {endContent && <InputGroup.Suffix>{endContent}</InputGroup.Suffix>}
          </InputGroup>
        ) : (
          <HeroInput ref={ref} id={inputId} className={inputClass} {...props} />
        )}
        
        {description && !isInvalid && <Description>{description}</Description>}
        {errorMessage && isInvalid && <FieldError>{errorMessage}</FieldError>}
      </TextField>
    );
  }
);

Input.displayName = "Input";
