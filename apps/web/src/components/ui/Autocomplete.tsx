import React from "react";
import { Autocomplete as HeroAutocomplete, AutocompleteProps as HeroAutocompleteProps } from "@heroui/react";

export interface AutocompleteProps<T extends object = any> {
  className?: string;
  classNames?: any;
  [key: string]: any;
}

export const Autocomplete = React.forwardRef<any, AutocompleteProps>(
  ({ className, classNames, ...props }, ref) => {
    const AutocompleteComponent = HeroAutocomplete as any;
    return (
      <AutocompleteComponent
        ref={ref}
        classNames={{
          base: className,
          // Apply the #f4f4f5 background specifically to the trigger just like Select
          trigger: `${classNames?.trigger || ""} bg-[#f4f4f5] shadow-none border-none dark:bg-zinc-800/60 rounded-xl transition-colors`,
          ...classNames
        }}
        {...props}
      />
    );
  }
);

Autocomplete.displayName = "Autocomplete";
