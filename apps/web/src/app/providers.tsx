"use client";

import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@/lib/toast/ToastContext";
import { useRouter } from "next/navigation";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </HeroUIProvider>
  );
}
