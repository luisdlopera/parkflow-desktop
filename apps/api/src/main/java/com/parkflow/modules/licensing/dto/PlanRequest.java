package com.parkflow.modules.licensing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;

public record PlanRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 2000) String description,
    @NotNull @DecimalMin(value = "0", inclusive = true) BigDecimal monthlyPrice,
    @NotNull @DecimalMin(value = "0", inclusive = true) BigDecimal yearlyPrice,
    boolean isActive,
    Map<String, Boolean> features
) {}
