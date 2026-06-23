import React from "react";
import { Skeleton as HeroSkeleton, SkeletonProps as HeroSkeletonProps } from "@heroui/react";

export interface SkeletonProps extends HeroSkeletonProps {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (props, ref) => <HeroSkeleton ref={ref as any} {...props} />
);
Skeleton.displayName = "Skeleton";

export default Skeleton;
