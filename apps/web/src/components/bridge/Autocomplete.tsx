import React from "react";
import { Autocomplete as HeroAutocomplete, AutocompleteProps as HeroAutocompleteProps } from "@heroui/react";

export type AutocompleteProps<T extends object = object> = HeroAutocompleteProps<T> & { classNames?: any };

export const AutocompleteBase = React.forwardRef(
  <T extends object = object>({ className, classNames, ...props }: AutocompleteProps<T>, ref: React.Ref<HTMLInputElement>) => {
    const autocompleteClassName = `${className || ""} ${classNames?.base || ""} focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-zinc-900`;
    return (
      <HeroAutocomplete
        ref={ref}
        className={autocompleteClassName}
        {...props as any}
      />
    );
  }
);

AutocompleteBase.displayName = "Autocomplete";

export const Autocomplete = Object.assign(AutocompleteBase, {
  Trigger: (HeroAutocomplete as unknown as Record<string, React.FC<React.PropsWithChildren>>).Trigger || (() => null),
  Popover: (HeroAutocomplete as unknown as Record<string, React.FC<React.PropsWithChildren>>).Popover || (() => null),
  Value: (HeroAutocomplete as unknown as Record<string, React.FC<React.PropsWithChildren>>).Value || (() => null),
  Indicator: (HeroAutocomplete as unknown as Record<string, React.FC<React.PropsWithChildren>>).Indicator || (() => null),
  ClearButton: (HeroAutocomplete as unknown as Record<string, React.FC<React.PropsWithChildren>>).ClearButton || (() => null),
  Filter: (HeroAutocomplete as unknown as Record<string, React.FC<React.PropsWithChildren<any>>>).Filter || (() => null),
});
