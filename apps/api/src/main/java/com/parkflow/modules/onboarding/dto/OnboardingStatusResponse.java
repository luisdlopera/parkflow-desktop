package com.parkflow.modules.onboarding.dto;

import com.parkflow.modules.licensing.enums.PlanType;
import java.util.Map;
import java.util.UUID;

public record OnboardingStatusResponse(
    UUID companyId,
    PlanType plan,
    boolean onboardingCompleted,
    int currentStep,
    boolean skipped,
    Map<String, Object> progressData,
    Map<String, Object> availableOptionsByPlan) {}
