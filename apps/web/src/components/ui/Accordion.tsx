import React from "react";
import { Accordion as HeroAccordion, AccordionItem as HeroAccordionItem, AccordionProps as HeroAccordionProps, AccordionItemProps as HeroAccordionItemProps } from "@heroui/react";

export interface AccordionItemProps extends Omit<HeroAccordionItemProps, "title" | "subtitle"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ title, subtitle, children, ...props }, ref) => {
    return (
      <HeroAccordionItem ref={ref} title={title as any} subtitle={subtitle as any} {...props as any}>
        {children}
      </HeroAccordionItem>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

export const Accordion = HeroAccordion;
