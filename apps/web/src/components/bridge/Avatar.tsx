import React from "react";
import { Avatar as HeroAvatar, AvatarProps as HeroAvatarProps } from "@heroui/react";

export interface AvatarProps extends Omit<HeroAvatarProps, "size" | "name"> {
  size?: "sm" | "md" | "lg" | (string & {});
  name?: string;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ size, name, ...props }, ref) => {
    return <HeroAvatar ref={ref as any} size={size as any} name={name} {...props as any} />;
  }
);
Avatar.displayName = "Avatar";
