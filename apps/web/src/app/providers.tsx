"use client";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider, useToast } from "@/lib/toast/ToastContext";
import { useRouter } from "next/navigation";
import { handleAuthFailureStatus } from "@/lib/auth";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <ToastProvider>
        <GlobalAuthEffects />
        {children}
      </ToastProvider>
    </HeroUIProvider>
  );
}

function GlobalAuthEffects() {
  const { warning } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await nativeFetch(input, init);
      const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      const isLoginRequest = requestUrl.includes("/api/v1/auth/login");
      if (!isLoginRequest && (response.status === 401 || response.status === 403)) {
        await handleAuthFailureStatus(response.status);
      }
      return response;
    };

    const onForbidden = () => {
      warning("No tienes permisos para realizar esta accion");
    };

    window.addEventListener("parkflow:forbidden", onForbidden);

    return () => {
      window.fetch = nativeFetch;
      window.removeEventListener("parkflow:forbidden", onForbidden);
    };
  }, [warning]);

  return null;
}
