package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import java.time.Duration;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pricing Facade Service.
 *
 * <p>Orchestrates pricing-related services: price calculation, rate resolution, and duration
 * computation. This facade provides a single point of entry for all pricing operations,
 * consolidating multiple services into a cohesive interface.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>ParkingPricingUseCaseImpl - Calculate parking fees and pricing breakdowns
 *   <li>RateApplicability - Resolve applicable rate for vehicle/site
 *   <li>DurationCalculator - Calculate session duration
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PricingFacadeService {

  @Deprecated(since = "2.1", forRemoval = false)
  private final ParkingPricingUseCaseImpl pricingUseCase;



  // ===========================================================================
  // Price Calculation
  // ===========================================================================

  /**
   * Calculate the price breakdown for a parking session given an exit time.
   *
   * @param session the parking session
   * @param exitTime the time of exit (used to calculate session duration)
   * @return the price breakdown containing cost details
   */
  @Transactional(readOnly = true)
  public PriceBreakdown calculatePrice(ParkingSession session, OffsetDateTime exitTime) {
    log.debug("Calculating price for session: {} with exit time: {}", session.getId(), exitTime);
    return pricingUseCase.calculateComplexPrice(session, exitTime, null, false, true);
  }

  /**
   * Calculate the price breakdown for a parking session with optional agreement override.
   *
   * @param session the parking session
   * @param exitTime the time of exit
   * @param agreementCode optional agreement code for pricing override
   * @return the price breakdown containing cost details
   */
  @Transactional(readOnly = true)
  public PriceBreakdown calculatePriceWithAgreement(
      ParkingSession session, OffsetDateTime exitTime, String agreementCode) {
    log.debug(
        "Calculating price for session: {} with agreement: {} at exit time: {}",
        session.getId(),
        agreementCode,
        exitTime);
    return pricingUseCase.calculateComplexPrice(session, exitTime, agreementCode, false, true);
  }

  // ===========================================================================
  // Duration Calculation
  // ===========================================================================

  /**
   * Calculate the duration of a parking session.
   *
   * @param entryTime the entry timestamp
   * @param exitTime the exit timestamp
   * @return the duration
   */
  @Transactional(readOnly = true)
  public Duration calculateDuration(OffsetDateTime entryTime, OffsetDateTime exitTime) {
    log.debug("Calculating duration from: {} to: {}", entryTime, exitTime);
    return Duration.between(entryTime, exitTime);
  }

  /**
   * Calculate the duration for a parking session.
   *
   * @param session the parking session
   * @param exitTime the exit timestamp
   * @return the duration
   */
  @Transactional(readOnly = true)
  public Duration calculateSessionDuration(ParkingSession session, OffsetDateTime exitTime) {
    log.debug(
        "Calculating session duration from entry: {} to exit: {}",
        session.getEntryAt(),
        exitTime);
    return calculateDuration(session.getEntryAt(), exitTime);
  }

  // ===========================================================================
  // Fraction Calculation (advanced pricing logic)
  // ===========================================================================

  /**
   * Calculate billable fractions for a duration using a rate configuration.
   *
   * @param durationMinutes the parking duration in minutes
   * @param rate the rate configuration with fraction interval
   * @return number of billable fractions (rounded up)
   */
  @Transactional(readOnly = true)
  public long calculateBillableFractions(long durationMinutes, Rate rate) {
    log.debug(
        "Calculating billable fractions for duration: {} minutes with fraction interval: {}",
        durationMinutes,
        rate.getFractionMinutes());
    if (durationMinutes <= 0) return 0;
    long fractionMinutes = rate.getFractionMinutes();
    return (durationMinutes + fractionMinutes - 1) / fractionMinutes; // Round up
  }

  /**
   * Calculate billable fractions for a parking session.
   *
   * @param session the parking session
   * @param exitTime the exit timestamp
   * @return number of billable fractions (rounded up)
   */
  @Transactional(readOnly = true)
  public long calculateSessionBillableFractions(ParkingSession session, OffsetDateTime exitTime) {
    log.debug("Calculating billable fractions for session: {} at exit time: {}", session.getId(), exitTime);
    Duration duration = calculateDuration(session.getEntryAt(), exitTime);
    return calculateBillableFractions(duration.toMinutes(), session.getRate());
  }
}
