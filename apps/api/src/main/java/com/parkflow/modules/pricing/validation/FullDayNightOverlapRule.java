package com.parkflow.modules.pricing.validation;

import org.springframework.stereotype.Component;

@Component
public class FullDayNightOverlapRule implements ValidationRule {
    @Override
    public boolean isApplicable(PricingValidationContext context) {
        return context.isNightEnabled();
    }

    @Override
    public ValidationError validate(PricingValidationContext context) {
        if ("FULL_DAY".equalsIgnoreCase(context.strategy())) {
            return new ValidationError("hasNightRate", "CONFLICT", "Un modelo de cobro 'Día Completo' no puede tener tarifa nocturna simultánea.");
        }
        return null;
    }
}
