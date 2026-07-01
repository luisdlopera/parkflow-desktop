package com.parkflow.modules.pricing.domain;

public interface PricingEngine {
    /**
     * Calculates the price quote based on the given context.
     * This method must be deterministic and pure (stateless).
     *
     * @param context Context containing all necessary data for calculation
     * @return A detailed quote including the trace and breakdown
     */
    PricingQuote calculate(PricingContext context);
}
