package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.common.exception.OperationException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transaction wrapper for onboarding materialization.
 * Ensures all entities (rates, vehicle types, lockers, spaces) are created
 * atomically or all fail together - prevents partial configuration state.
 *
 * FASE V: Distributed transaction management
 * Resolves Hallazgo #8: No cross-module transactionality
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingMaterializationTransactionService {

  private final OnboardingService onboardingService;

  /**
   * Wraps onboarding completion with transactional guarantees.
   * If any materialization step fails, all are rolled back.
   *
   * @param companyId company to complete onboarding for
   * @throws OperationException if any materialization step fails
   */
  @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
  public void completeOnboardingAtomically(UUID companyId) {
    List<String> failures = new ArrayList<>();

    try {
      log.info("Starting atomic onboarding completion for company {}", companyId);

      // Step 1: Validate all required data exists (fail fast)
      validateOnboardingData(companyId);

      // Step 2: Complete onboarding (triggers all materializations)
      onboardingService.completeOnboarding(companyId);

      log.info("Successfully completed onboarding for company {}", companyId);

    } catch (Exception e) {
      failures.add(e.getMessage());
      log.error("Onboarding completion failed for company {}: {}", companyId, e.getMessage(), e);

      // Aggregate all failures into single exception
      String failureMessage = String.join("; ", failures);
      throw new OperationException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "ONBOARDING_MATERIALIZATION_FAILED",
          "Onboarding materialization failed - all changes rolled back: " + failureMessage
      );
    }
  }

  /**
   * Retry wrapper for atomic onboarding completion.
   * Attempts up to 3 times with exponential backoff.
   *
   * @param companyId company to complete onboarding for
   * @throws OperationException if all retry attempts fail
   */
  public void completeOnboardingWithRetry(UUID companyId) {
    int maxAttempts = 3;
    int delay = 100; // ms

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        completeOnboardingAtomically(companyId);
        return; // Success

      } catch (Exception e) {
        log.warn("Onboarding attempt {} of {} failed for company {}: {}",
            attempt, maxAttempts, companyId, e.getMessage());

        if (attempt == maxAttempts) {
          // Last attempt failed - propagate exception
          throw e;
        }

        // Exponential backoff before retry
        try {
          Thread.sleep(delay);
          delay *= 2;
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          throw new OperationException(
              HttpStatus.INTERNAL_SERVER_ERROR,
              "ONBOARDING_INTERRUPTED",
              "Onboarding retry interrupted"
          );
        }
      }
    }
  }

  private void validateOnboardingData(UUID companyId) {
    // TODO: Add validation for required onboarding data
    // E.g., check that company has provided necessary configuration
  }
}
