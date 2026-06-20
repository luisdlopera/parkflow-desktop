"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import { ChevronUp } from "lucide-react";
import { scrollToTop, getScrollBehavior } from "@/lib/animations/utils";

interface ScrollToTopButtonProps {
  threshold?: number; // pixels scrolled before showing button
}

/**
 * ScrollToTopButton with smooth scroll and animation
 * Shows/hides based on scroll position with fade animation
 */
export function ScrollToTopButton({ threshold = 100 }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollTop > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const handleClick = () => {
    scrollToTop(getScrollBehavior() === "smooth");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-8 right-8 z-40"
        >
          <Button
            isIconOnly
            className="bg-brand hover:bg-brand-600 text-white rounded-full shadow-lg"
            onClick={handleClick}
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
