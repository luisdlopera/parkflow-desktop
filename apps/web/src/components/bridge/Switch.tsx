import React from "react";
import { Switch as HeroSwitch, Label, SwitchProps as HeroSwitchProps } from "@heroui/react";

export interface SwitchProps extends Omit<HeroSwitchProps, "onChange" | "children" | "color" | "onValueChange"> {
  isSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
  onValueChange?: (isSelected: boolean) => void;
  color?: string; // v2 prop
  children?: React.ReactNode;
}

export const Switch = React.forwardRef<HTMLLabelElement, SwitchProps>(
  ({ isSelected, onChange, onValueChange, color, size, children, className, ...rest }, ref) => {
    // Remove any potentially invalid props before spreading
    const { onValueChange: _omit, ...props } = rest as any;
    const switchClassName = `${className || ""} focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-zinc-900`;
    return (
      <HeroSwitch
        ref={ref}
        isSelected={isSelected}
        onValueChange={(isSelected: boolean) => {
          if (onChange) onChange(isSelected);
          onValueChange?.(isSelected);
        }}
        size={size}
        className={switchClassName}
        {...props}
      >
        <HeroSwitch.Control>
          <HeroSwitch.Thumb />
        </HeroSwitch.Control>
        {children && (
          <HeroSwitch.Content>
            <Label className="text-sm">{children}</Label>
          </HeroSwitch.Content>
        )}
      </HeroSwitch>
    );
  }
);

Switch.displayName = "Switch";
