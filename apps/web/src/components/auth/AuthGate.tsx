"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@heroui/react";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  // Listen for auth expiry event from fetch layer
  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ next: string }>;
      const nextUrl = customEvent.detail?.next ?? "/";
      router.push(`/login?next=${encodeURIComponent(nextUrl)}&reason=expired`);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("parkflow-auth-expired", handleAuthExpired);
      return () => window.removeEventListener("parkflow-auth-expired", handleAuthExpired);
    }
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }

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
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading) {
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
