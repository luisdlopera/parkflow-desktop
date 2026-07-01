package com.parkflow.modules.pricing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record PricingEngineV1Request(
    @NotBlank String name,
    String currency,
    Boolean active,
    Boolean advancedMode,
    String vehicleType,
    String site,
    UUID siteId,
    @NotNull @Valid PricingStrategyDto strategy,
    @NotNull @Valid PricingRulesDto rules,
    @NotNull @Valid PricingRatesDto rates) {}
