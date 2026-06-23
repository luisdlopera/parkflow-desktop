import React from "react";
import { Popover as HeroPopover, PopoverProps as HeroPopoverProps } from "@heroui/react";

export interface PopoverProps extends HeroPopoverProps {}

export const Popover = (props: PopoverProps) => <HeroPopover {...props} />;

Popover.Trigger = HeroPopover.Trigger;
Popover.Content = HeroPopover.Content;
Popover.Dialog = HeroPopover.Dialog;
Popover.Heading = HeroPopover.Heading;
Popover.Arrow = HeroPopover.Arrow;

export default Popover;
