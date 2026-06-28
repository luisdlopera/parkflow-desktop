package com.parkflow.modules.onboarding.domain.repository;

import com.parkflow.modules.licensing.domain.Company;

public interface PlanStepValidationPort {
    boolean isPlanStepAllowed(Company company, int step);
}
