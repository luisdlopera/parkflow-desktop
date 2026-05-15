package com.parkflow.modules.onboarding.application.port.in;

import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import java.util.Map;
import java.util.UUID;

public interface OnboardingUseCase {
    OnboardingStatusResponse status(UUID companyId);
    OnboardingStatusResponse saveOnboardingStep(UUID companyId, int step, Map<String, Object> data);
    OnboardingStatusResponse skipAndApplyDefaults(UUID companyId);
    OnboardingStatusResponse completeOnboarding(UUID companyId);
    boolean isFeatureEnabled(UUID companyId, String featureKey);
    Map<String, Object> getCompanySettings(UUID companyId);
    CompanyCapabilitiesResponse getCapabilities(UUID companyId);
}
