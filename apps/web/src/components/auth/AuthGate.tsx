"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { currentUser, loadSession, logoutAndRedirectToLogin } from "@/lib/auth";
import { useSessionMonitor } from "@/lib/hooks/useSessionMonitor";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const { isExpired } = useSessionMonitor();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let mounted = true;
    void (async () => {
      const session = await loadSession();
      const user = await currentUser();
      if (!session || !user) {
        if (mounted) {
          router.replace(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
        }
        return;
      }
      if (mounted) {
        const isChangePasswordPage = pathname?.startsWith("/change-password");
        const isOnboardingPage = pathname?.startsWith("/onboarding");

        if (user.requirePasswordChange && !isChangePasswordPage && user.role !== "SUPER_ADMIN") {
          router.replace("/change-password");
          return;
        }

        if (!user.requirePasswordChange && isChangePasswordPage) {
          router.replace("/");
          return;
        }

        if (!user.onboardingCompleted && !isOnboardingPage) {
          router.replace("/onboarding");
          return;
        }

        if (user.onboardingCompleted && isOnboardingPage) {
          router.replace("/");
          return;
        }

        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (isExpired && ready) {
      void logoutAndRedirectToLogin("expired");
    }
  }, [isExpired, ready]);

  if (!ready) {
    return <div className="p-6 text-sm text-slate-600">Validando sesion...</div>;
  }

  return <>{children}</>;
}
