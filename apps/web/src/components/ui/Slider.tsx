import React from "react";
import { Slider as HeroSlider, SliderProps as HeroSliderProps } from "@heroui/react";

export interface SliderProps extends Omit<HeroSliderProps, "step" | "minValue" | "maxValue" | "size" | "onChange"> {
  step?: number;
  minValue?: number;
  maxValue?: number;
  marks?: any;
  size?: string;
  color?: string;
  onChange?: (value: number | number[]) => void;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ size, color, ...props }, ref) => {
    return <HeroSlider ref={ref} {...props as any} />;
  }
);
Slider.displayName = "Slider";
