package com.parkflow.modules.pricing.validation;

public interface ValidationRule {
    /**
     * Determines if this rule should be evaluated against the current context.
     * Use this to create conditional validations based on feature flags or strategy.
     */
    boolean isApplicable(PricingValidationContext context);

    /**
     * Evaluates the rule and returns a ValidationError if invalid, or null if valid.
     */
    ValidationError validate(PricingValidationContext context);
}
