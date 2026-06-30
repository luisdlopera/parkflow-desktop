"use client";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import { Toast, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { SWRConfig } from "swr";
import { errorService } from "@/lib/errors/error-service";

import { DialogProvider } from "@/providers/DialogProvider";
import { AuthProvider } from "@/providers/AuthProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  useEffect(() => {
    const onLogout = () => useAuthStore.getState().logout();
    window.addEventListener("parkflow-logout", onLogout);
    return () => window.removeEventListener("parkflow-logout", onLogout);
  }, []);

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        shouldRetryOnError: (error) => {
          return error?.status !== 401;
        },
        onError: (error) => {
          if (error?.status === 401 || error?.status === 403) return;
          errorService.toast.error(error);
        },
      }}
    >
      <HeroUIProvider navigate={router.push}>
        <Toast.Provider placement="top end" />
        <DialogProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </DialogProvider>
      </HeroUIProvider>
    </SWRConfig>
  );
}
