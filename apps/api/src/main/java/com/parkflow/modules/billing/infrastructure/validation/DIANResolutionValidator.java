package com.parkflow.modules.billing.infrastructure.validation;

import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.CountryCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Validates Colombian DIAN resolution parameters.
 * DIAN (Dirección de Impuestos y Aduanas Nacionales) requires:
 * - Resolution number (e.g., 18760000001)
 * - Prefix (e.g., FEV, FE)
 * - Numeración range (from/to)
 * - Validity dates (from/to)
 */
@Slf4j
@Component
public class DIANResolutionValidator {

  public ValidationResult validate(InvoiceProviderConfig config) {
    if (!config.getCountryCode().equals(CountryCode.CO)) {
      return ValidationResult.OK;
    }

    // Validate resolution for Colombia
    if (config.getResolutionNumber() == null || config.getResolutionNumber().isBlank()) {
      return ValidationResult.error("Resolution number is required for Colombia (DIAN)");
    }

    if (config.getResolutionPrefix() == null || config.getResolutionPrefix().isBlank()) {
      return ValidationResult.error("Resolution prefix is required (e.g., FEV, FE)");
    }

    if (config.getResolutionFrom() == null || config.getResolutionTo() == null) {
      return ValidationResult.error("Resolution range (from/to) is required");
    }

    if (config.getResolutionFrom() > config.getResolutionTo()) {
      return ValidationResult.error("Resolution 'from' cannot be greater than 'to'");
    }

    if (config.getResolutionValidFrom() == null || config.getResolutionValidTo() == null) {
      return ValidationResult.error("Resolution validity dates are required");
    }

    if (config.getResolutionValidFrom().isAfter(config.getResolutionValidTo())) {
      return ValidationResult.error("Resolution valid-from cannot be after valid-to");
    }

    if (config.getResolutionValidTo().isBefore(LocalDate.now())) {
      return ValidationResult.warning("Resolution validity expired: " + config.getResolutionValidTo());
    }

    log.info("[DIAN] Resolution {} ({}) validated: range {}-{}",
        config.getResolutionNumber(), config.getResolutionPrefix(),
        config.getResolutionFrom(), config.getResolutionTo());

    return ValidationResult.OK;
  }

  public static class ValidationResult {
    public static final ValidationResult OK = new ValidationResult(true, null, Level.INFO);

    public final boolean valid;
    public final String message;
    public final Level level;

    private ValidationResult(boolean valid, String message, Level level) {
      this.valid = valid;
      this.message = message;
      this.level = level;
    }

    public static ValidationResult error(String message) {
      return new ValidationResult(false, message, Level.ERROR);
    }

    public static ValidationResult warning(String message) {
      return new ValidationResult(true, message, Level.WARNING);
    }

    public enum Level { INFO, WARNING, ERROR }
  }
}
