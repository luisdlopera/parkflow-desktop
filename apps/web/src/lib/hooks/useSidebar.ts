"use client";

import { useState, useCallback, useEffect } from "react";
import { useIsMobile, useIsTablet, useIsDesktop } from "./useMediaQuery";

type SidebarState = "expanded" | "collapsed" | "hidden";

interface UseSidebarReturn {
  state: SidebarState;
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  collapse: () => void;
  expand: () => void;
}

export function useSidebar(): UseSidebarReturn {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  const [state, setState] = useState<SidebarState>("expanded");
  const [isOpen, setIsOpen] = useState(false);

  // Update state based on screen size
  useEffect(() => {
    if (isMobile) {
      setState("hidden");
      setIsOpen(false);
    } else if (isTablet) {
      setState("collapsed");
      setIsOpen(true);
    } else {
      setState("expanded");
      setIsOpen(true);
    }
  }, [isMobile, isTablet, isDesktop]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setIsOpen((prev) => !prev);
    } else if (isTablet) {
      setState((prev) => (prev === "collapsed" ? "expanded" : "collapsed"));
    } else {
      setState((prev) => (prev === "collapsed" ? "expanded" : "collapsed"));
    }
  }, [isMobile, isTablet]);

  const open = useCallback(() => {
    setIsOpen(true);
    if (!isMobile) {
      setState("expanded");
    }
  }, [isMobile]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const collapse = useCallback(() => {
    if (!isMobile) {
      setState("collapsed");
    }
  }, [isMobile]);

  const expand = useCallback(() => {
    if (!isMobile) {
      setState("expanded");
    }
  }, [isMobile]);

  const isCollapsed = state === "collapsed";

  return {
    state,
    isOpen,
    isCollapsed,
    toggle,
    open,
    close,
    collapse,
    expand,
  };
}
