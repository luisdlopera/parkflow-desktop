package com.parkflow.modules.pricing.infrastructure.controller;

import com.parkflow.modules.parking.operation.domain.Rate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

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
    public ResponseEntity<Map<String, Object>> getRulesetForDesktopSync() {
        return ResponseEntity.ok(Map.of(
            "version", "1.0",
            "engine", "DefaultPricingEngine",
            "rules", Map.of(
                "strategy", "unified",
                "features", Map.of(
                    "supports_fractional", true,
                    "supports_mixed", true,
                    "supports_hourly", true
                )
            ),
            "timestamp", java.time.OffsetDateTime.now()
        ));
    }
}
