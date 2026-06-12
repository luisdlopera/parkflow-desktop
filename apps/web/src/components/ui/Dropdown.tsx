import React from "react";
import { 
  Dropdown as HeroDropdown, 
  DropdownItemProps as HeroDropdownItemProps,
  Label,
  Description
} from "@heroui/react";

export interface DropdownItemProps extends Omit<HeroDropdownItemProps, "startContent" | "endContent" | "description" | "textValue" | "children"> {
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  description?: React.ReactNode;
  textValue?: string;
  color?: string; // v2 compatibility
  href?: string;
  as?: any;
  children?: React.ReactNode | ((props: any) => React.ReactNode);
}

export const DropdownItem = React.forwardRef<HTMLLIElement, DropdownItemProps>(
  ({ children, startContent, endContent, description, textValue, color, href, as, ...props }, ref) => {
    return (
      <HeroDropdown.Item 
        ref={ref as any} 
        textValue={textValue || (typeof children === 'string' ? children : undefined)}
        href={href}
        variant={color === "danger" ? "danger" : undefined}
        {...props as any}
      >
        {startContent}
        <Label>
          {typeof children === 'function' ? (children as any)({}) : children}
        </Label>
        {description && <Description>{description}</Description>}
        {endContent}
      </HeroDropdown.Item>
    );
  }
);
DropdownItem.displayName = "DropdownItem";

export const Dropdown = (props: any) => <HeroDropdown {...props} />;
export const DropdownTrigger = HeroDropdown.Trigger;
export const DropdownMenu = (props: any) => (
  <HeroDropdown.Popover>
    <HeroDropdown.Menu {...props} />
  </HeroDropdown.Popover>
);
export const DropdownSection = (props: any) => <HeroDropdown.Section {...props} />;
