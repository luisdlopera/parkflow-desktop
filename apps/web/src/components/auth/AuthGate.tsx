"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@heroui/react";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logoutReason } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const reasonQuery = logoutReason ? `&reason=${encodeURIComponent(logoutReason)}` : "";
      router.replace(`/login?next=${encodeURIComponent(pathname ?? "/")}${reasonQuery}`);
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
