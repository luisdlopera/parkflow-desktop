import React from "react";
import { Select as HeroSelect, SelectProps as HeroSelectProps, Label, Description, FieldError } from "@heroui/react";

export interface SelectProps extends Omit<HeroSelectProps<any>, "value" | "onChange" | "size" | "label" | "description" | "className" | "classNames"> {
  value?: any[] | any; // To support v2 array passing
  selectedKeys?: any[] | any;
  defaultSelectedKeys?: any[] | any;
  onChange?: (val: any) => void;
  size?: "sm" | "md" | "lg" | string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  placeholder?: string;
  className?: string;
  classNames?: any;
  isInvalid?: boolean;
}

export const SelectBase = React.forwardRef<any, SelectProps>(
  ({ value, selectedKeys, defaultSelectedKeys, selectedKey, defaultSelectedKey, onChange, onSelectionChange, size, label, description, errorMessage, isInvalid, placeholder, className, classNames, children, ...props }, ref) => {
    
    // Determine the selected key based on v2 array props
    let resolvedSelectedKey = selectedKey;
    if (Array.isArray(selectedKey)) {
        resolvedSelectedKey = selectedKey[0] || null;
    } else if (value && Array.isArray(value)) {
      resolvedSelectedKey = value[0] || null;
    } else if (selectedKeys && Array.isArray(selectedKeys)) {
      resolvedSelectedKey = selectedKeys[0] || null;
    } else if (value && typeof value === 'string') {
      resolvedSelectedKey = value;
    }

    let resolvedDefaultSelectedKey = defaultSelectedKey;
    if (Array.isArray(defaultSelectedKey)) {
        resolvedDefaultSelectedKey = defaultSelectedKey[0] || null;
    } else if (defaultSelectedKeys && Array.isArray(defaultSelectedKeys)) {
      resolvedDefaultSelectedKey = defaultSelectedKeys[0] || null;
    }

    const handleSelectionChange = (keys: any) => {
      if (onSelectionChange) onSelectionChange(keys);
      if (onChange) {
        onChange(keys);
      }
    };

    return (
      <HeroSelect
        ref={ref as any}
        placeholder={placeholder}
        value={resolvedSelectedKey as any}
        defaultValue={resolvedDefaultSelectedKey as any}
        onChange={handleSelectionChange as any}
        classNames={{
          ...classNames,
          trigger: `!bg-[#f4f4f5] data-[hover=true]:!bg-[#e4e4e7] shadow-none border-none dark:!bg-zinc-800/60 dark:data-[hover=true]:!bg-zinc-700/60 rounded-xl transition-colors ${classNames?.trigger || ""}`,
        }}
        className={className}
        isInvalid={isInvalid}
        {...props as any}
      >
        {label && <Label>{label}</Label>}
        {children}
        {description && !isInvalid && <Description>{description}</Description>}
        {errorMessage && isInvalid && <FieldError>{errorMessage}</FieldError>}
      </HeroSelect>
    );
  }
);

SelectBase.displayName = "Select";

export const Select = Object.assign(SelectBase, {
  Trigger: (HeroSelect as any).Trigger || (() => null),
  Popover: (HeroSelect as any).Popover || (() => null),
  Value: (HeroSelect as any).Value || (() => null),
  Indicator: (HeroSelect as any).Indicator || (() => null),
});
