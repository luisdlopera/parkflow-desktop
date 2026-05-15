package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;

import java.time.OffsetDateTime;

/**
 * Port (inbound) for complex parking price calculation.
 *
 * <p>Encapsulates the full pricing pipeline:
 * <ol>
 *   <li>Base duration with grace period</li>
 *   <li>Monthly contract check (zero-cost exit)</li>
 *   <li>Prepaid balance deduction</li>
 *   <li>Base tariff calculation</li>
 *   <li>Corporate agreement discount or flat rate</li>
 * </ol>
 *
 * <p>Use cases that need pricing (exit, lost ticket, preview) depend on this port,
 * never on concrete repositories from other modules.
 */
public interface ComplexPricingPort {

  /**
   * Calculates the full price breakdown for a parking session.
   *
   * @param session       the active parking session
   * @param exitAt        the effective exit timestamp
   * @param agreementCode optional corporate agreement code (overrides session's stored code)
   * @param lostTicket    whether this is a lost-ticket settlement (applies surcharge, skips prepaid)
   * @param dryRun        if true, no state mutations are applied (prepaid not deducted, session not mutated)
   * @return the computed price breakdown
   */
  PriceBreakdown calculate(
      ParkingSession session,
      OffsetDateTime exitAt,
      String agreementCode,
      boolean lostTicket,
      boolean dryRun);

  /**
   * Applies courtesy pricing rules: non-VISITOR sessions exit at zero cost
   * (unless it is a lost-ticket settlement).
   *
   * @param session              the parking session
   * @param computed             the previously computed price breakdown
   * @param lostTicketSettlement whether this is a lost-ticket settlement (courtesy rules do not apply)
   * @return adjusted price breakdown (zero total for non-VISITOR sessions)
   */
  PriceBreakdown applyCourtesy(
      ParkingSession session,
      PriceBreakdown computed,
      boolean lostTicketSettlement);
}
