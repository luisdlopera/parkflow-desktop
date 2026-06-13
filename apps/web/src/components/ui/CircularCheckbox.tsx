import React from 'react';
import { Checkbox as HeroCheckbox } from '@heroui/react';
import { Check } from 'lucide-react';

let shiftHeld = false;

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => { if (e.key === "Shift") shiftHeld = true; });
  window.addEventListener("keyup", (e) => { if (e.key === "Shift") shiftHeld = false; });
}

export interface CircularCheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean, e: { shiftKey: boolean }) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function CircularCheckbox({
  checked = false,
  indeterminate = false,
  onChange,
  className,
  disabled = false,
  "aria-label": ariaLabel
}: CircularCheckboxProps) {
  return (
    <HeroCheckbox
      isSelected={checked}
      isIndeterminate={indeterminate}
      isDisabled={disabled}
      onChange={(selected) => {
        onChange?.(selected, { shiftKey: shiftHeld });
      }}
      aria-label={ariaLabel || "Select row"}
    >
      <HeroCheckbox.Control className="w-5 h-5 rounded-full">
        <HeroCheckbox.Indicator>
          {checked && !indeterminate && (
            <Check className="w-3 h-3" strokeWidth={3} />
          )}
          {indeterminate && (
            <div className="w-2.5 h-0.5 bg-white rounded-full" />
          )}
        </HeroCheckbox.Indicator>
      </HeroCheckbox.Control>
    </HeroCheckbox>
  );
}
