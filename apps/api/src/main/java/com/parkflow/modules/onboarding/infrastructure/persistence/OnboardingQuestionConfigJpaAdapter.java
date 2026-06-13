package com.parkflow.modules.onboarding.infrastructure.persistence;

import com.parkflow.modules.onboarding.domain.OnboardingQuestionConfig;
import com.parkflow.modules.onboarding.domain.repository.OnboardingQuestionConfigPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Component
@RequiredArgsConstructor
public class OnboardingQuestionConfigJpaAdapter implements OnboardingQuestionConfigPort {

  private final OnboardingQuestionConfigJpaRepository jpaRepository;

  @Override
  public List<OnboardingQuestionConfig> findAllByOrderByStepNumberAsc() {
    return jpaRepository.findAllByOrderByStepNumberAsc();
  }

  @Override
  public Optional<OnboardingQuestionConfig> findByStepNumber(int stepNumber) {
    return jpaRepository.findByStepNumber(stepNumber);
  }

  @Override
  public OnboardingQuestionConfig save(OnboardingQuestionConfig config) {
    return jpaRepository.save(config);
  }

  @Override
  public Optional<OnboardingQuestionConfig> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public void deleteById(UUID id) {
    jpaRepository.deleteById(id);
  }

  @Override
  public List<OnboardingQuestionConfig> findAllEnabled() {
    return jpaRepository.findAllByEnabledTrueOrderByStepNumberAsc();
  }

  @Repository
  interface OnboardingQuestionConfigJpaRepository extends JpaRepository<OnboardingQuestionConfig, UUID> {
    List<OnboardingQuestionConfig> findAllByOrderByStepNumberAsc();
    Optional<OnboardingQuestionConfig> findByStepNumber(int stepNumber);
    List<OnboardingQuestionConfig> findAllByEnabledTrueOrderByStepNumberAsc();
  }
}
