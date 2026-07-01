package com.parkflow.modules.pricing.validation;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class NightPriceRule implements ValidationRule {

    @Override
    public boolean isApplicable(PricingValidationContext context) {
        // Appy this rule ONLY if night shift feature flag is enabled
        // AND the strategy is not FLAT (as FLAT ignores time ranges).
        return context.isNightEnabled() && !"FLAT".equalsIgnoreCase(context.strategy());
    }

    @Override
    public ValidationError validate(PricingValidationContext context) {
        if (context.nightPrice() == null || context.nightPrice().compareTo(BigDecimal.ZERO) < 0) {
            return new ValidationError(
                "nightPrice",
                "REQUIRED_AND_POSITIVE",
                "El precio nocturno es obligatorio y debe ser >= 0 cuando el horario especial está activo."
            );
        }
        return null;
    }
}
