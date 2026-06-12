import React from "react";
import { Tabs as HeroTabs, TabProps as HeroTabProps, TabsProps as HeroTabsProps } from "@heroui/react";

export interface TabProps extends Omit<HeroTabProps, "id" | "children" | "title"> {
  key?: any;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export function Tab(props: TabProps) {
  return <>{props.children}</>;
}

export interface TabsProps extends Omit<HeroTabsProps, "children" | "onSelectionChange" | "selectedKey" | "defaultSelectedKey"> {
  selectedKey?: any;
  defaultSelectedKey?: any;
  onSelectionChange?: (key: any) => void;
  onChange?: (key: any) => void;
  children: React.ReactNode;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ selectedKey, defaultSelectedKey, onSelectionChange, onChange, children, className, ...props }, ref) => {
    
    // Support both onChange and onSelectionChange
    const handleChange = (key: any) => {
      if (onSelectionChange) onSelectionChange(key);
      if (onChange) onChange(key);
    };

    const tabs = React.Children.toArray(children).filter((child: any) => React.isValidElement(child) && child.type === Tab);

    return (
      <HeroTabs 
        ref={ref}
        selectedKey={selectedKey} 
        defaultSelectedKey={defaultSelectedKey} 
        onSelectionChange={handleChange} 
        className={className}
        {...props as any}
      >
        <HeroTabs.ListContainer>
          <HeroTabs.List>
            {tabs.map((tab: any) => (
              <HeroTabs.Tab key={tab.key || tab.props.key} id={(tab.key || tab.props.key) as string}>
                {tab.props.title}
                <HeroTabs.Indicator />
              </HeroTabs.Tab>
            ))}
          </HeroTabs.List>
        </HeroTabs.ListContainer>
        {tabs.map((tab: any) => (
          <HeroTabs.Panel key={tab.key || tab.props.key} id={(tab.key || tab.props.key) as string}>
            {tab.props.children}
          </HeroTabs.Panel>
        ))}
      </HeroTabs>
    );
  }
);

Tabs.displayName = "Tabs";
