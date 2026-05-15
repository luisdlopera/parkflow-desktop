package com.parkflow.modules.onboarding.infrastructure.persistence;

import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OnboardingProgressJpaAdapter implements OnboardingProgressPort {

  private final OnboardingProgressJpaRepository jpaRepository;

  @Override
  public Optional<OnboardingProgress> findByCompanyId(UUID companyId) {
    return jpaRepository.findByCompanyId(companyId);
  }

  @Override
  public OnboardingProgress save(OnboardingProgress progress) {
    return jpaRepository.save(progress);
  }

  @Override
  public Optional<OnboardingProgress> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface OnboardingProgressJpaRepository extends JpaRepository<OnboardingProgress, UUID> {
    Optional<OnboardingProgress> findByCompanyId(UUID companyId);
  }
}
