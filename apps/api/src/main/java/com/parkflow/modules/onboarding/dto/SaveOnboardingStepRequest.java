package com.parkflow.modules.onboarding.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import java.util.Map;

public record SaveOnboardingStepRequest(
    @NotNull @Min(1) @Max(12) Integer step,
    @NotNull @NotEmpty Map<String, Object> data,
    @Min(1) @Max(12) Integer targetStep) {}
