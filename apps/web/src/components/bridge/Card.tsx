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
  ({ shadow: _, border, className, ...props }, ref) => {
    // Always use border-based elevation system, no shadows
    const elevationClass = "border border-default-200";
    return (
      <HeroCard ref={ref as any} className={`${elevationClass} ${className || ""}`} {...props as any} />
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
