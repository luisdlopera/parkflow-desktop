package com.parkflow.modules.pricing.dto;

import jakarta.validation.Valid;

public record PricingVehicleOverrideDto(
    Boolean inheritsBase,
    @Valid PricingStrategyDto strategy,
    @Valid PricingRulesDto rules,
    @Valid PricingRatesDto rates) {}
