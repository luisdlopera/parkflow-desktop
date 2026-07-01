package com.parkflow.modules.pricing.validation;

import org.springframework.stereotype.Component;

@Component
public class NightTimeRangeRule implements ValidationRule {
    @Override
    public boolean isApplicable(PricingValidationContext context) {
        return context.isNightEnabled();
    }

    @Override
    public ValidationError validate(PricingValidationContext context) {
        String start = context.nightStartTime();
        String end = context.nightEndTime();

        if (start == null || start.isBlank() || !isValidTimeFormat(start)) {
            return new ValidationError("nightStartTime", "INVALID_TIME", "Ingresa la hora de inicio de la tarifa nocturna en formato HH:MM.");
        }
        if (end == null || end.isBlank() || !isValidTimeFormat(end)) {
            return new ValidationError("nightEndTime", "INVALID_TIME", "Ingresa la hora de fin de la tarifa nocturna en formato HH:MM.");
        }
        if (start.equals(end)) {
            return new ValidationError("nightStartTime", "EQUAL_TIME", "La hora de inicio y fin de la tarifa nocturna no pueden ser iguales.");
        }
        return null;
    }
    
    private boolean isValidTimeFormat(String s) {
        return s != null && s.matches("^([01]?[0-9]|2[0-3]):[0-5][0-9]$");
    }
}
