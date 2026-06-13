"use client";

import { useEffect, useState } from "react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { currentUser } from "@/lib/auth";

export default function OnboardingGate() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const user = await currentUser();
        if (!mounted || !user) {
          setLoading(false);
          return;
        }
        // El usuario ya trae onboardingCompleted desde el login
        if (!user.onboardingCompleted) {
          setCompanyId(user.companyId);
          setShowWizard(true);
        }
      } catch {
        // Si falla algo, no bloqueamos al usuario, solo no mostramos onboarding
        if (mounted) {
          setShowWizard(false);
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
  }, []);

  if (loading) return null;
  if (!showWizard || !companyId) return null;
  return <OnboardingWizard companyId={companyId} onDone={() => setShowWizard(false)} />;
}
