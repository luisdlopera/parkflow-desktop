import React from "react";
import { Select as HeroSelect, SelectProps as HeroSelectProps, Label, Description, FieldError } from "@heroui/react";

type SelectValue = string | number | boolean;

export interface SelectProps extends Omit<HeroSelectProps<any>, "value" | "onChange" | "size" | "label" | "description" | "className" | "classNames"> {
  value?: SelectValue[] | SelectValue; // To support v2 array passing
  selectedKeys?: SelectValue[] | SelectValue;
  defaultSelectedKeys?: SelectValue[] | SelectValue;
  onChange?: ((val: Set<SelectValue>) => void) | ((val: unknown) => void) | ((event: any) => void);
  size?: "sm" | "md" | "lg" | (string & {});
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  placeholder?: string;
  className?: string;
  classNames?: Partial<Record<string, string>>;
  isInvalid?: boolean;
  isRequired?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export const SelectBase = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ value, selectedKeys, defaultSelectedKeys, selectedKey, defaultSelectedKey, onChange, onSelectionChange, size, label, description, errorMessage, isInvalid, isRequired, placeholder, className, classNames, children, "aria-label": ariaLabel, "aria-describedby": ariaDescribedby, ...rest }, ref) => {
    // Remove potentially invalid props before spreading
    const { onChange: _omit2, ...props } = rest as any;
    const uniqueId = React.useId();
    const selectId = (props.id as string) || uniqueId;
    const errorId = `${selectId}-error`;
    const descriptionId = `${selectId}-description`;

    // Combine aria-describedby for error and description
    const combinedAriaDescribedby = [
      ariaDescribedby,
      isInvalid && errorMessage ? errorId : null,
      description && !isInvalid ? descriptionId : null,
    ]
      .filter(Boolean)
      .join(" ");

    // Determine the selected key based on v2 array props
    let resolvedSelectedKey: SelectValue | null = selectedKey || null;
    if (Array.isArray(selectedKey)) {
        resolvedSelectedKey = selectedKey[0] || null;
    } else if (value && Array.isArray(value)) {
      resolvedSelectedKey = value[0] || null;
    } else if (selectedKeys && Array.isArray(selectedKeys)) {
      resolvedSelectedKey = selectedKeys[0] || null;
    } else if (value && typeof value === 'string') {
      resolvedSelectedKey = value;
    }

    let resolvedDefaultSelectedKey: SelectValue | null = defaultSelectedKey || null;
    if (Array.isArray(defaultSelectedKey)) {
        resolvedDefaultSelectedKey = defaultSelectedKey[0] || null;
    } else if (defaultSelectedKeys && Array.isArray(defaultSelectedKeys)) {
      resolvedDefaultSelectedKey = defaultSelectedKeys[0] || null;
    }

    const handleSelectionChange = (keys: Set<SelectValue> | SelectValue[] | SelectValue) => {
      if (onSelectionChange) onSelectionChange(keys as any);
      if (onChange) {
        // HeroUI v3 Select normaliza onChange a Key | Key[] | null
        // Para compatibilidad con código existente que usa Array.from(keys)[0],
        // convertimos a Set como en HeroUI v2
        const isMultiple = props.selectionMode === "multiple";
        if (isMultiple) {
          (onChange as any)(Array.isArray(keys) ? new Set(keys) : new Set(keys ? [keys] : []));
        } else {
          (onChange as any)(keys !== null && keys !== undefined ? new Set([keys]) : new Set());
        }
      }
    };

    return (
      <HeroSelect
        ref={ref}
        placeholder={placeholder}
        value={resolvedSelectedKey}
        defaultValue={resolvedDefaultSelectedKey}
        onChange={handleSelectionChange}
        classNames={{
          ...classNames,
          trigger: `!bg-[#f4f4f5] data-[hover=true]:!bg-[#e4e4e7] border-none dark:!bg-zinc-800/60 dark:data-[hover=true]:!bg-zinc-700/60 rounded-xl transition-colors focus:outline-none focus:ring-3 focus:ring-offset-2 focus:ring-brand-500 dark:focus:ring-offset-zinc-900 ${classNames?.trigger || ""}`,
        }}
        className={className}
        isInvalid={isInvalid}
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        aria-required={isRequired}
        aria-describedby={combinedAriaDescribedby || undefined}
        {...(props as any)}
      >
        {label && <Label>{label}</Label>}
        {children}
        {description && !isInvalid && <Description id={descriptionId}>{description}</Description>}
        {errorMessage && isInvalid && <FieldError id={errorId}>{errorMessage}</FieldError>}
      </HeroSelect>
    );
  }
);

SelectBase.displayName = "Select";

type SelectComponent = React.ForwardRefExoticComponent<SelectProps & React.RefAttributes<HTMLSelectElement>> & {
  Trigger: React.ComponentType<any>;
  Popover: React.ComponentType<any>;
  Value: React.ComponentType<any>;
  Indicator: React.ComponentType<any>;
};

export const Select = Object.assign(SelectBase, {
  Trigger: (HeroSelect as any).Trigger || (() => null),
  Popover: (HeroSelect as any).Popover || (() => null),
  Value: (HeroSelect as any).Value || (() => null),
  Indicator: (HeroSelect as any).Indicator || (() => null),
}) as SelectComponent;
