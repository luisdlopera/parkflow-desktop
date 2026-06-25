"use client";

import { useEffect, useState } from "react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { currentUser } from "@/lib/services/auth-domain.service";
export default function OnboardingGate() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const user = await currentUser();
        if (!mounted) return;
        if (!user) {
          setLoading(false);
          return;
        }
        if (!user.onboardingCompleted) {
          setCompanyId(user.companyId);
          setShowWizard(true);
        }
      } catch {
        // Fallo al obtener usuario: no asumir que el onboarding está completo
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
