package com.parkflow.modules.pricing.dto;

import java.util.UUID;

public record PricingEngineV1Response(
    UUID id,
    String version,
    String name,
    String currency,
    boolean active,
    boolean advancedMode,
    String vehicleType,
    String site,
    UUID siteId,
    PricingStrategyDto strategy,
    PricingRulesDto rules,
    PricingRatesDto rates) {}
