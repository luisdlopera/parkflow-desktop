import React from "react";
import { Tabs as HeroTabs, Tab as HeroTab, TabProps as HeroTabProps, TabsProps as HeroTabsProps } from "@heroui/react";

export interface TabProps extends Omit<HeroTabProps, "title" | "children"> {
  key?: any;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export const Tab = HeroTab;

export interface TabsProps extends Omit<HeroTabsProps, "onSelectionChange"> {
  onSelectionChange?: (key: any) => void;
  onChange?: (key: any) => void;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ onSelectionChange, onChange, children, className, ...props }, ref) => {
    
    // Support both onChange and onSelectionChange
    const handleChange = (key: any) => {
      if (onSelectionChange) onSelectionChange(key);
      if (onChange) onChange(key);
    };

    return (
      <HeroTabs 
        ref={ref}
        onSelectionChange={handleChange} 
        className={className}
        {...props as any}
      >
        {children}
      </HeroTabs>
    );
  }
);

Tabs.displayName = "Tabs";
