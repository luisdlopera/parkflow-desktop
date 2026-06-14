/**
 * @deprecated This component is deprecated. DataTable now uses native HeroUI selection.
 * Kept for backward compatibility. Do not use in new code.
 */
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
    <div className="flex items-center justify-center">
      <HeroCheckbox
        isSelected={checked}
        isIndeterminate={indeterminate}
        isDisabled={disabled}
        className={className}
        classNames={{ wrapper: "rounded-full" }}
        onValueChange={(selected: boolean) => {
          onChange?.(selected, { shiftKey: shiftHeld });
        }}
        aria-label={ariaLabel || "Select row"}
        {...({ slot: "selection" } as any)}
      />
    </div>
  );
}
