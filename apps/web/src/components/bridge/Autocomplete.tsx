import React from "react";
import { Autocomplete as HeroAutocomplete, AutocompleteProps as HeroAutocompleteProps } from "@heroui/react";

export interface AutocompleteProps<T extends object = any> {
  className?: string;
  classNames?: any;
  [key: string]: any;
}

export const AutocompleteBase = React.forwardRef<any, AutocompleteProps>(
  ({ className, classNames, ...props }, ref) => {
    const AutocompleteComponent = HeroAutocomplete as any;
    return (
      <AutocompleteComponent
        ref={ref}
        classNames={{
          ...classNames,
          base: `${className || ""} ${classNames?.base || ""}`,
          trigger: `shadow-none border-none rounded-xl transition-colors ${classNames?.trigger || ""}`,
        }}
        {...props}
      />
    );
  }
);

AutocompleteBase.displayName = "Autocomplete";

export const Autocomplete = Object.assign(AutocompleteBase, {
  Trigger: (HeroAutocomplete as any).Trigger || (() => null),
  Popover: (HeroAutocomplete as any).Popover || (() => null),
  Value: (HeroAutocomplete as any).Value || (() => null),
  Indicator: (HeroAutocomplete as any).Indicator || (() => null),
  ClearButton: (HeroAutocomplete as any).ClearButton || (() => null),
  Filter: (HeroAutocomplete as any).Filter || (() => null),
});
