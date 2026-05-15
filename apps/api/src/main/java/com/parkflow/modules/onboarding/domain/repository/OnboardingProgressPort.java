package com.parkflow.modules.onboarding.domain.repository;

import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import java.util.Optional;
import java.util.UUID;

public interface OnboardingProgressPort {
  Optional<OnboardingProgress> findByCompanyId(UUID companyId);
  OnboardingProgress save(OnboardingProgress progress);
  Optional<OnboardingProgress> findById(UUID id);
}
