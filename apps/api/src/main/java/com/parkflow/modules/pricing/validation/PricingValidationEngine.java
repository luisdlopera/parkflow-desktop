package com.parkflow.modules.pricing.validation;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class PricingValidationEngine {

    private final List<ValidationRule> rules = new ArrayList<>();

    public PricingValidationEngine(List<ValidationRule> injectedRules) {
        if (injectedRules != null) {
            this.rules.addAll(injectedRules);
        }
    }

    public List<ValidationError> validate(PricingValidationContext context) {
        return rules.stream()
            .filter(rule -> rule.isApplicable(context))
            .map(rule -> rule.validate(context))
            .filter(Objects::nonNull)
            .toList();
    }
}
