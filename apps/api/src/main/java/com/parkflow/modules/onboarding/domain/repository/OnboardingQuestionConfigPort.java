package com.parkflow.modules.onboarding.domain.repository;

import com.parkflow.modules.onboarding.domain.OnboardingQuestionConfig;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OnboardingQuestionConfigPort {
  List<OnboardingQuestionConfig> findAllByOrderByStepNumberAsc();
  Optional<OnboardingQuestionConfig> findByStepNumber(int stepNumber);
  OnboardingQuestionConfig save(OnboardingQuestionConfig config);
  Optional<OnboardingQuestionConfig> findById(UUID id);
  void deleteById(UUID id);
  List<OnboardingQuestionConfig> findAllEnabled();
}
