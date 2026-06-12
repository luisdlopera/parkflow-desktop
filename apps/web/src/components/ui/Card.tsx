import React from "react";
import { 
  Card as HeroCard, 
  CardProps as HeroCardProps 
} from "@heroui/react";

export interface CardProps extends Omit<HeroCardProps, "shadow"> {
  shadow?: "none" | "sm" | "md" | "lg" | string;
}

export const CardBase = React.forwardRef<HTMLDivElement, CardProps>(
  ({ shadow, className, ...props }, ref) => {
    const shadowClass = shadow === "none" ? "shadow-none" : shadow === "sm" ? "shadow-sm" : shadow === "md" ? "shadow-md" : shadow === "lg" ? "shadow-lg" : "";
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
