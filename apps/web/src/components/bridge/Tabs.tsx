import React from "react";
import { Tabs as HeroTabs, TabsProps as HeroTabsProps } from "@heroui/react";

export interface TabProps {
  id?: string;
  tabKey?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
}

export const Tab: React.FC<TabProps> = () => null;

export interface TabsProps extends Omit<HeroTabsProps, "onSelectionChange" | "children"> {
  onSelectionChange?: (key: any) => void;
  onChange?: (key: any) => void;
  children?: React.ReactNode;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ onSelectionChange, onChange, children, className, ...rest }, ref) => {
    // Remove any potentially invalid props before spreading
    const { onSelectionChange: _omit, onChange: _omit2, ...props } = rest as any;

    // Support both onChange and onSelectionChange
    const handleChange = (key: any) => {
      if (onSelectionChange) onSelectionChange(key);
      if (onChange) onChange(key);
    };

    const tabs: any[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === Tab) {
        tabs.push(child.props);
      }
    });

    return (
      <HeroTabs
        ref={ref}
        onSelectionChange={handleChange}
        className={className}
        {...props as any}
      >
        <HeroTabs.ListContainer>
          <HeroTabs.List aria-label="Tabs">
            {tabs.map((t, i) => (
              <HeroTabs.Tab key={t.tabKey || t.id || i} id={t.tabKey || t.id || String(i)}>
                {t.title}
                <HeroTabs.Indicator />
              </HeroTabs.Tab>
            ))}
          </HeroTabs.List>
        </HeroTabs.ListContainer>
        {tabs.map((t, i) => (
          t.children ? (
            <HeroTabs.Panel key={t.tabKey || t.id || i} id={t.tabKey || t.id || String(i)}>
              {t.children}
            </HeroTabs.Panel>
          ) : null
        ))}
      </HeroTabs>
    );
  }
);

Tabs.displayName = "Tabs";
