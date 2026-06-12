import React from "react";
import { Switch as HeroSwitch, Label, SwitchProps as HeroSwitchProps } from "@heroui/react";

export interface SwitchProps extends Omit<HeroSwitchProps, "onChange" | "children" | "color"> {
  isSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
  color?: string; // v2 prop
  children?: React.ReactNode;
}

export const Switch = React.forwardRef<HTMLLabelElement, SwitchProps>(
  ({ isSelected, onChange, color, size, children, className, ...props }, ref) => {
    return (
      <HeroSwitch 
        ref={ref}
        isSelected={isSelected} 
        onChange={onChange} 
        size={size} 
        className={className}
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
