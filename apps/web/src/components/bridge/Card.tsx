import React from "react";
import { 
  Card as HeroCard, 
  CardProps as HeroCardProps 
} from "@heroui/react";

export interface CardProps extends Omit<HeroCardProps, "shadow"> {
  shadow?: "none" | "sm" | "md" | "lg" | (string & {});
  border?: boolean;
}

export const CardBase = React.forwardRef<HTMLDivElement, CardProps>(
  ({ shadow, border, className, ...props }, ref) => {
    const shadowClass = shadow === "none" ? "shadow-none" : shadow ? "border border-default-200" : "";
    return (
      <HeroCard ref={ref as any} className={`${shadowClass} ${className || ""}`} {...props as any} />
    );
  }
);
CardBase.displayName = "Card";

export const Card = Object.assign(CardBase, {
  Header: HeroCard.Header,
  Body: HeroCard.Content,
  Content: HeroCard.Content, // Map Content to Body for backwards compatibility
  Footer: HeroCard.Footer,
});
