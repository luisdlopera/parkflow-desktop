"use client";

import { useEffect, useState } from "react";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { resolveCurrentCompanyId } from "@/lib/current-company";
import { fetchOnboardingStatus } from "@/lib/onboarding-api";

export default function OnboardingGate() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    let mounted = true;
    resolveCurrentCompanyId()
      .then(async (id) => {
        if (!mounted || !id) return;
        setCompanyId(id);
        const status = await fetchOnboardingStatus(id);
        if (!status.onboardingCompleted) {
          setShowWizard(true);
        }
      })
      .catch(() => {
        setShowWizard(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!showWizard || !companyId) return null;
  return <OnboardingWizard companyId={companyId} onDone={() => setShowWizard(false)} />;
}
