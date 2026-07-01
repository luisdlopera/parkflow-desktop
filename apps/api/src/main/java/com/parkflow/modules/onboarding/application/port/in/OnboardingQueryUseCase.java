package com.parkflow.modules.onboarding.application.port.in;

import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.dto.CompanySettingsResponse;
import java.util.Map;
import java.util.UUID;

/**
 * Input port for onboarding query operations: status, settings, capabilities.
 */
public interface OnboardingQueryUseCase {
    OnboardingStatusResponse status(UUID companyId);
    boolean isFeatureEnabled(UUID companyId, String featureKey);
    CompanySettingsResponse getCompanySettings(UUID companyId);
    CompanyCapabilitiesResponse getCapabilities(UUID companyId);
}
