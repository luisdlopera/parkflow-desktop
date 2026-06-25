package com.parkflow.modules.onboarding.application.port.in;

import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import java.util.Map;
import java.util.UUID;

/**
 * Input port for onboarding progress operations: save steps, complete, skip, reset.
 */
public interface OnboardingProgressUseCase {
    OnboardingStatusResponse saveOnboardingStep(UUID companyId, int step, Map<String, Object> data, Integer targetStep);
    OnboardingStatusResponse skipAndApplyDefaults(UUID companyId);
    OnboardingStatusResponse completeOnboarding(UUID companyId);
    OnboardingStatusResponse resetOnboarding(UUID companyId, String reason);
}
