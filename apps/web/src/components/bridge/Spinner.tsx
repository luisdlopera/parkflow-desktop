import React from "react";
import { Spinner as HeroSpinner, SpinnerProps as HeroSpinnerProps } from "@heroui/react";

export interface SpinnerProps extends HeroSpinnerProps {}

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  (props, ref) => <HeroSpinner ref={ref as any} {...props} />
);
Spinner.displayName = "Spinner";

export default Spinner;
