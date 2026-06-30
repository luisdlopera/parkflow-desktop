package com.parkflow.modules.pricing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PricingSimulationRequest(
    @NotNull @Valid PricingConfigurationRequest configuration,
    @Min(0) long stayMinutes,
    String vehicleType) {}
