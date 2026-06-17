"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentUser } from "@/lib/auth";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const user = await currentUser();
        if (!mounted) return;
        if (!user) {
          router.replace("/login");
          return;
        }
        if (user.onboardingCompleted) {
          router.replace("/");
          return;
        }
        setCompanyId(user.companyId);
      } catch {
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
  }, [router]);

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
