package com.parkflow.modules.onboarding.domain;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.onboarding.domain.repository.PlanStepValidationPort;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OnboardingStateMachine {

  private final PlanStepValidationPort planStepValidation;

  /**
   * Validates if the target step is allowed, preventing bounds overflow (I-02) 
   * and ensuring the company plan allows it.
   */
  public void validateTargetStep(Company company, int targetStep) {
    if (targetStep < 1 || targetStep > 12) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El paso debe estar entre 1 y 12.");
    }
    if (!planStepValidation.isPlanStepAllowed(company, targetStep)) {
      throw new OperationException(
          HttpStatus.FORBIDDEN,
          "El paso " + targetStep + " no está disponible en el plan " + company.getPlan().name());
    }
  }

  /**
   * Calculates the next valid step, skipping steps that are not allowed by the company's plan.
   * If all subsequent steps are disabled, it defaults to 12.
   */
  public int calculateNextStep(Company company, int currentStep) {
    for (int next = currentStep + 1; next <= 12; next++) {
      if (planStepValidation.isPlanStepAllowed(company, next)) {
        return next;
      }
    }
    return 12; // Maximum step
  }

  /**
   * Resolves the current step considering targetStep (I-02 boundary check)
   * and backwards step prevention (I-03 logic).
   * 
   * If a targetStep is provided, it's a jump (backward or forward).
   * If not, we just advance to the next allowed step.
   * 
   * Note on I-03 (backward jumps): If we jump backward, we allow it, but we
   * should theoretically clear dependent future state if required, or simply
   * allow the user to edit and then re-validate upon 'Next'.
   */
  public int determineNextStep(Company company, int currentStep, Integer targetStep) {
    if (targetStep != null) {
      validateTargetStep(company, targetStep);
      return targetStep;
    }
    return calculateNextStep(company, currentStep);
  }
}
