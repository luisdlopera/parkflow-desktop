package com.parkflow.modules.onboarding.repository;

import com.parkflow.modules.onboarding.entity.OnboardingProgress;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingProgressRepository extends JpaRepository<OnboardingProgress, UUID> {
  Optional<OnboardingProgress> findByCompanyId(UUID companyId);
}
