"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@heroui/react";
import { useAuthStore } from "@/lib/stores/auth.store";
import { isTauri } from "@/auth/runtime/detectRuntime";
import { getSession, signOut, useSession } from "next-auth/react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const storeAuth = useAuthStore();
  const webSession = useSession();
  const isDesktop = isTauri();
  const [verifyingSession, setVerifyingSession] = useState(false);
  const verifyingSessionRef = useRef(false);
  const isLoading = isDesktop ? storeAuth.isLoading : webSession.status === "loading";
  const isAuthenticated = isDesktop ? storeAuth.isAuthenticated : webSession.status === "authenticated";
  const user = isDesktop ? storeAuth.user : webSession.data?.user;

  // Listen for auth expiry event from fetch layer
  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ next: string }>;
      const nextUrl = customEvent.detail?.next ?? "/";
      router.push(`/login?next=${encodeURIComponent(nextUrl)}&reason=expired`);
    };

    if (!isDesktop && typeof window !== "undefined") {
      window.addEventListener("parkflow-auth-expired", handleAuthExpired);
      return () => window.removeEventListener("parkflow-auth-expired", handleAuthExpired);
    }
  }, [isDesktop, router]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      if (isDesktop) {
        router.replace(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
      }
      return;
    }

    if (!isDesktop && webSession.data?.parkflow?.error) {
      void signOut({ redirect: false }).then(() => {
        router.replace(`/login?reason=session-expired&next=${encodeURIComponent(pathname ?? "/")}`);
      });
      return;
    }

    // Read navigation flags from auth store (set during login/restore-session).
    // At runtime user is always AuthUser which has these fields; the store type marks them optional.
    if (!user) return;

    const isChangePasswordPage = pathname?.startsWith("/change-password");
    const isOnboardingPage = pathname?.startsWith("/onboarding");

    if (user.requirePasswordChange && !isChangePasswordPage && user.role !== "SUPER_ADMIN") {
      router.replace("/change-password");
    } else if (!user.requirePasswordChange && isChangePasswordPage) {
      router.replace("/");
    } else if (!user.onboardingCompleted && !isOnboardingPage) {
      router.replace("/onboarding");
    } else if (user.onboardingCompleted && isOnboardingPage) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, user, pathname, router, isDesktop, webSession.data?.parkflow?.error]);

  if (isLoading || verifyingSession) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-6 w-full rounded-xl" />
        <Skeleton className="h-6 w-3/4 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
