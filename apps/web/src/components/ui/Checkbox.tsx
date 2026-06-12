import React from "react";
import { Checkbox as HeroCheckbox, CheckboxProps as HeroCheckboxProps } from "@heroui/react";

export interface CheckboxProps extends Omit<HeroCheckboxProps, "onChange" | "isSelected" | "defaultSelected" | "color" | "size" | "name" | "onBlur"> {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: ((checked: boolean) => void) | React.ChangeEventHandler<HTMLInputElement> | any;
  onValueChange?: (checked: boolean) => void;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | string;
  size?: "sm" | "md" | "lg" | string;
  name?: string;
  onBlur?: any;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ isSelected, defaultSelected, onChange, onValueChange, color, size, name, onBlur, ...props }, ref) => {
    // HeroUI v3 Checkbox does not support color or size props, we map or ignore them
    // For size we could use a custom class, but for now we just ignore
    let mappedClassName = props.className || "";
    if (size === "sm") mappedClassName += " scale-90";
    if (size === "lg") mappedClassName += " scale-110";

    const handleChange = (checked: boolean) => {
      if (onValueChange) onValueChange(checked);
      if (onChange) {
        // if onChange expects event, we can't easily mock it without target
        // but react hook form uses onChange for standard inputs.
        // We just pass checked.
        onChange(checked as any); 
      }
    };

    return (
      <HeroCheckbox
        ref={ref}
        isSelected={isSelected}
        defaultSelected={defaultSelected}
        onValueChange={handleChange}
        className={mappedClassName}
        name={name}
        onBlur={onBlur}
        {...(props as any)}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";
