"use client";

import { useEffect, useState } from "react";

export function useOsShortcut() {
  const [modifier, setModifier] = useState<"Cmd" | "Ctrl" | "⌘" | "Cmd/Ctrl">("Cmd/Ctrl");
  const [modifierSymbol, setModifierSymbol] = useState<"⌘" | "Ctrl" | "⌘/Ctrl">("⌘/Ctrl");
  const [isMac, setIsMac] = useState<boolean | null>(null);

  useEffect(() => {
    // navigator.userAgent is widely supported. 
    // Testing for Mac in user agent string covers macOS and iOS (which is fine for "⌘").
    const isMacOs = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    
    setIsMac(isMacOs);
    if (isMacOs) {
      setModifier("Cmd");
      setModifierSymbol("⌘");
    } else {
      setModifier("Ctrl");
      setModifierSymbol("Ctrl");
    }
  }, []);

  return { modifier, modifierSymbol, isMac };
}
