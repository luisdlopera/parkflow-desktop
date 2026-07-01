package com.parkflow.modules.pricing.dto;

import java.time.OffsetDateTime;
import java.util.Map;

public record PricingRulesetSyncResponse(
    String version,
    String engine,
    PricingRulesDetail rules,
    OffsetDateTime timestamp
) {
    public record PricingRulesDetail(
        String strategy,
        Map<String, Boolean> features
    ) {}
}
