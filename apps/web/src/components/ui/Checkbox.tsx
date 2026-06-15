import React from "react";
import { Checkbox as HeroCheckbox, Label, CheckboxProps as HeroCheckboxProps } from "@heroui/react";

export interface CheckboxProps extends Omit<HeroCheckboxProps, "onChange" | "children" | "color" | "size" | "name" | "onBlur"> {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: ((checked: boolean) => void) | React.ChangeEventHandler<HTMLInputElement> | any;
  onValueChange?: (checked: boolean) => void;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | (string & {});
  size?: "sm" | "md" | "lg" | (string & {});
  name?: string;
  onBlur?: any;
  children?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ isSelected, defaultSelected, onChange, onValueChange, color, size, name, onBlur, children, className, ...props }, ref) => {
    // HeroUI v3 Checkbox does not support color or size props directly, we map or ignore them
    let mappedClassName = className || "";
    if (size === "sm") mappedClassName += " scale-90";
    if (size === "lg") mappedClassName += " scale-110";

    const handleChange = (checked: boolean) => {
      if (onValueChange) onValueChange(checked);
      if (onChange) {
        onChange(checked as any); 
      }
    };

    return (
      <HeroCheckbox
        ref={ref}
        isSelected={isSelected}
        defaultSelected={defaultSelected}
        onChange={handleChange}
        className={mappedClassName}
        name={name}
        onBlur={onBlur}
        {...(props as any)}
      >
        <HeroCheckbox.Control>
          <HeroCheckbox.Indicator />
        </HeroCheckbox.Control>
        {children && (
          <HeroCheckbox.Content>
            <Label className="text-sm">{children}</Label>
          </HeroCheckbox.Content>
        )}
      </HeroCheckbox>
    );
  }
);
Checkbox.displayName = "Checkbox";
