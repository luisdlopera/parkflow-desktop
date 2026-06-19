"use client";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import { Toast, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { handleAuthFailureStatus } from "@/lib/auth";
import { SWRConfig } from "swr";

import { DialogProvider } from "@/components/ui/DialogProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <HeroUIProvider navigate={router.push}>
        <Toast.Provider placement="top end" />
        <DialogProvider>
          <GlobalAuthEffects />
          {children}
        </DialogProvider>
      </HeroUIProvider>
    </SWRConfig>
  );
}

function GlobalAuthEffects() {
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
      try {
        const { handleLocalFirstFetch } = await import("@/lib/local-first/fetch-interceptor");
        const localResponse = await handleLocalFirstFetch(input, init);
        if (localResponse) {
          return localResponse;
        }
      } catch (err) {
        console.error("LocalFirst Interceptor load error:", err);
      }

      const nativeFetch = window.__parkflowNativeFetch ?? window.fetch.bind(window);
      const response = await nativeFetch(input, init);
      const requestUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      const requestMethod =
        init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
      const requestPath = new URL(response.url).pathname;
      const isLoginRequest = requestUrl.includes("/api/v1/auth/login");
      const isLogoutRequest = requestPath.includes("/api/v1/auth/logout");
      const isSilent = getHeader(init?.headers, "X-Parkflow-Auth-Toast-Silent") === "1";
      if (!isLoginRequest && !isLogoutRequest && (response.status === 401 || response.status === 403)) {
        const key = `${response.status}:${requestMethod}:${requestPath}`;
        await handleAuthFailureStatus(response.status);
        if (!isSilent && response.status === 403 && shouldToast(key)) {
          toast.warning("No tienes permisos para realizar esta accion");
        }
      }
      return response;
    };

    if (!window.__parkflowNativeFetch) {
      window.__parkflowNativeFetch = window.fetch.bind(window);
    }
    // Expose a namespaced wrapper instead of replacing global fetch to avoid breaking
    // integrations (Tauri native fetch bridge, MSW in tests, etc.). Consumers should
    // use the centralized API wrapper in /lib/api/fetch.ts which will prefer this wrapper
    // when present.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__parkflowFetchWrapper = wrapped;

    return () => {
      // cleanup wrapper
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete window.__parkflowFetchWrapper;
    };
  }, []);

  return null;
}

declare global {
  interface Window {
    __parkflowNativeFetch?: typeof fetch;
    __parkflowFetchWrapper?: typeof fetch;
  }
}
