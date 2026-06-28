"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/services/auth-domain.service";
import { useAuthStore } from "@/lib/stores/auth.store";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const router = useRouter();
  const authStoreIsLoading = useAuthStore((s) => s.isLoading);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for AuthProvider to restore session
    if (authStoreIsLoading) {
      console.log("[OnboardingPage] Waiting for session restoration...");
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const user = await currentUser();
        if (!mounted) return;
        if (!user) {
          console.warn("[OnboardingPage] No user found, redirecting to login");
          router.replace("/login");
          return;
        }
        console.log("[OnboardingPage] User loaded:", {
          email: user.email,
          companyId: user.companyId,
          onboardingCompleted: user.onboardingCompleted,
        });
        if (user.onboardingCompleted) {
          console.log("[OnboardingPage] Onboarding already completed, redirecting to dashboard");
          router.replace("/");
          return;
        }
        if (!user.companyId) {
          console.error("[OnboardingPage] ERROR: user.companyId is null or undefined!");
        }
        setCompanyId(user.companyId);
      } catch (error) {
        console.error("[OnboardingPage] Error loading user:", error);
        if (mounted) {
          router.replace("/login");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, authStoreIsLoading]);

  if (loading || !companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-default-500">Cargando onboarding...</p>
      </div>
    );
  }

  return (
    <OnboardingWizard
      companyId={companyId}
      onDone={() => router.replace("/")}
    />
  );
}
