package com.parkflow.modules.pricing.infrastructure.controller;

import com.parkflow.modules.pricing.dto.PricingRulesetSyncResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import java.util.Map;
import java.time.OffsetDateTime;

/**
 * Controller to expose pricing rules (DSL) for offline Desktop (Rust) synchronization.
 */
@RestController
@RequestMapping("/api/v1/pricing/ruleset")
public class PricingRulesController {

    // For demonstration of the DSL export architecture.
    // In a real scenario, this would query the DB for all active Rates
    // and map them into the JSON AST expected by the Rust engine.

    @GetMapping("/sync")
    @ResponseStatus(HttpStatus.OK)
    public PricingRulesetSyncResponse getRulesetForDesktopSync() {
        return new PricingRulesetSyncResponse(
            "1.0",
            "DefaultPricingEngine",
            new PricingRulesetSyncResponse.PricingRulesDetail(
                "unified",
                Map.of(
                    "supports_fractional", true,
                    "supports_mixed", true,
                    "supports_hourly", true
                )
            ),
            OffsetDateTime.now()
        );
    }
}
