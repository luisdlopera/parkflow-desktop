import useSWR from "swr";
import { fetchOnboardingStatus, type OnboardingStatus } from "@/lib/onboarding-api";

export function useOnboardingStatus(companyId: string | null) {
  return useSWR<OnboardingStatus>(
    companyId ? ["onboarding-status", companyId] : null,
    ([, id]: [string, string]) => fetchOnboardingStatus(id),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );
}
