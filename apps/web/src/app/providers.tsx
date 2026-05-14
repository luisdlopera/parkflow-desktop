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

    const toastCooldownMs = 3000;
    const dedupe = new Map<string, number>();
    const shouldToast = (key: string): boolean => {
      const now = Date.now();
      const last = dedupe.get(key) ?? 0;
      if (now - last < toastCooldownMs) {
        return false;
      }
      dedupe.set(key, now);
      return true;
    };

    const getHeader = (headers: HeadersInit | undefined, name: string): string | null => {
      if (!headers) return null;
      if (headers instanceof Headers) return headers.get(name);
      if (Array.isArray(headers)) {
        const hit = headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
        return hit?.[1] ?? null;
      }
      const recordValue = (headers as Record<string, string>)[name];
      if (recordValue) return recordValue;
      const lower = Object.entries(headers as Record<string, string>).find(
        ([k]) => k.toLowerCase() === name.toLowerCase()
      );
      return lower?.[1] ?? null;
    };

    const wrapped = async (input: RequestInfo | URL, init?: RequestInit) => {
      const nativeFetch = window.__parkflowNativeFetch ?? window.fetch.bind(window);
      const response = await nativeFetch(input, init);
      const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      const requestMethod =
        init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
      const isLoginRequest = requestUrl.includes("/api/v1/auth/login");
      const isSilent = getHeader(init?.headers, "X-Parkflow-Auth-Toast-Silent") === "1";
      if (!isLoginRequest && !isSilent && (response.status === 401 || response.status === 403)) {
        const key = `${response.status}:${requestMethod}:${new URL(response.url).pathname}`;
        await handleAuthFailureStatus(response.status);
        if (response.status === 403 && shouldToast(key)) {
          warning("No tienes permisos para realizar esta accion");
        }
      }
      return response;
    };

    if (!window.__parkflowNativeFetch) {
      window.__parkflowNativeFetch = window.fetch.bind(window);
    }
    window.fetch = wrapped;

    return () => {
      if (window.__parkflowNativeFetch) {
        window.fetch = window.__parkflowNativeFetch;
      }
    };
  }, [warning]);

  return null;
}

declare global {
  interface Window {
    __parkflowNativeFetch?: typeof fetch;
  }
}
