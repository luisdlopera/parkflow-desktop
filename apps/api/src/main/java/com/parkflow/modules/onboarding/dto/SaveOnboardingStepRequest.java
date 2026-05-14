package com.parkflow.modules.onboarding.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record SaveOnboardingStepRequest(
    @NotNull @Min(1) @Max(12) Integer step,
    @NotNull Map<String, Object> data) {}
