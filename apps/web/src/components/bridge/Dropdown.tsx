import React from "react";
import {
  Dropdown as HeroDropdown,
  DropdownItemProps as HeroDropdownItemProps,
  Label,
  Description
} from "@heroui/react";

interface ChildrenRenderProps {
  // Props that may be passed to children render function
  [key: string]: unknown;
}

export interface DropdownItemProps extends Omit<HeroDropdownItemProps, "startContent" | "endContent" | "description" | "textValue" | "children"> {
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  description?: React.ReactNode;
  textValue?: string;
  color?: string; // v2 compatibility
  href?: string;
  as?: React.ElementType;
  children?: React.ReactNode | ((props: ChildrenRenderProps) => React.ReactNode);
}

export interface DropdownProps extends React.ComponentPropsWithRef<typeof HeroDropdown> {
  [key: string]: unknown;
}

export interface DropdownMenuProps extends React.ComponentPropsWithRef<typeof HeroDropdown.Menu> {
  [key: string]: unknown;
}

export interface DropdownSectionProps extends React.ComponentPropsWithRef<typeof HeroDropdown.Section> {
  [key: string]: unknown;
}

export const DropdownItem = React.forwardRef<HTMLLIElement, DropdownItemProps>(
  ({ children, startContent, endContent, description, textValue, color, href, as, ...props }, ref) => {
    return (
      <HeroDropdown.Item
        ref={ref}
        textValue={textValue || (typeof children === 'string' ? children : undefined)}
        href={href}
        variant={color === "danger" ? "danger" : undefined}
        {...props}
      >
        {startContent}
        <Label>
          {typeof children === 'function' ? children({}) : children}
        </Label>
        {description && <Description>{description}</Description>}
        {endContent}
      </HeroDropdown.Item>
    );
  }
);
DropdownItem.displayName = "DropdownItem";

export const Dropdown = (props: DropdownProps) => <HeroDropdown {...props} />;
export const DropdownTrigger = HeroDropdown.Trigger;
export const DropdownMenu = (props: DropdownMenuProps) => (
  <HeroDropdown.Popover>
    <HeroDropdown.Menu {...props} />
  </HeroDropdown.Popover>
);
export const DropdownSection = (props: DropdownSectionProps) => <HeroDropdown.Section {...props} />;
