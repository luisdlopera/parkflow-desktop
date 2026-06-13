package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.onboarding.domain.OnboardingQuestionConfig;
import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import org.springframework.stereotype.Component;

@Component
public class OnboardingQuestionConfigMapper {

  public OnboardingQuestionConfigDto toDto(OnboardingQuestionConfig entity) {
    if (entity == null) {
      return null;
    }
    return new OnboardingQuestionConfigDto(
        entity.getId(),
        entity.getStepNumber(),
        entity.getTitle(),
        entity.getDescription(),
        entity.isEnabled(),
        entity.isRequired(),
        entity.isPlanRestricted());
  }

  public OnboardingQuestionConfig toEntity(OnboardingQuestionConfigDto dto) {
    if (dto == null) {
      return null;
    }
    OnboardingQuestionConfig entity = new OnboardingQuestionConfig();
    entity.setStepNumber(dto.stepNumber());
    entity.setTitle(dto.title());
    entity.setDescription(dto.description());
    entity.setEnabled(dto.enabled());
    entity.setRequired(dto.required());
    entity.setPlanRestricted(dto.planRestricted());
    return entity;
  }
}
