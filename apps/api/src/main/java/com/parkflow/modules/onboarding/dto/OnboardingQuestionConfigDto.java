package com.parkflow.modules.onboarding.dto;

import java.util.UUID;

public record OnboardingQuestionConfigDto(
    UUID id,
    int stepNumber,
    String title,
    String description,
    boolean enabled,
    boolean required,
    boolean planRestricted) {}
