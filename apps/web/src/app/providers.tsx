"use client";

import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import { Toast, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { SWRConfig } from "swr";
import { loadSession, clearSession } from "@/features/auth/services/auth-storage.service";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";

import { DialogProvider } from "@/components/ui/DialogProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  useEffect(() => {
    loadSession().then((session) => {
      if (!session) return;
      useAuthStore.getState().setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      });
      useAuthStore.getState().setPermissions(session.user.permissions as string[]);
    });
    const onLogout = () => useAuthStore.getState().logout();
    window.addEventListener("parkflow-logout", onLogout);
    return () => window.removeEventListener("parkflow-logout", onLogout);
  }, []);

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 2000,
        onError: (error) => {
          // Don't show toast for auth/permission errors — let components handle redirects
          if (error?.status === 401 || error?.status === 403) return;
          toast.danger(getUserFriendlyErrorMessage(error, FrontendActionError.LOAD_DATA));
        },
      }}
    >
      <HeroUIProvider navigate={router.push}>
        <Toast.Provider placement="top end" />
        <DialogProvider>
          {children}
        </DialogProvider>
      </HeroUIProvider>
    </SWRConfig>
  );
}

