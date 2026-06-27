package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.application.port.out.AgreementPort;
import com.parkflow.modules.configuration.application.port.out.MonthlyContractPort;
import com.parkflow.modules.configuration.application.port.out.PrepaidBalancePort;
import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.pricing.PricingCalculator;
import com.parkflow.modules.parking.operation.domain.pricing.RateWindowResolver;
import com.parkflow.modules.common.exception.OperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Canonical implementation of the complex parking pricing pipeline.
 *
 * <p>This service is the single source of truth for price calculation, replacing the
 * duplicate {@code calculateComplexPrice()} that previously existed in both
 * {@code OperationService} and {@code RegisterExitService}. Any future pricing changes
 * must be made here, not in individual use-case services.
 *
 * <p>Pricing pipeline (in order):
 * <ol>
 *   <li>Resolve rate and calculate billable duration</li>
 *   <li>Monthly contract check → zero-cost exit for active subscribers</li>
 *   <li>Prepaid balance deduction (skipped on lost-ticket)</li>
 *   <li>Base tariff calculation via {@link PricingCalculator}</li>
 *   <li>Corporate agreement: flat rate or percentage discount</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class ComplexPricingService implements ComplexPricingPort {

  private final MonthlyContractPort monthlyContractRepository;
  private final PrepaidBalancePort prepaidBalanceRepository;
  private final PrepaidUseCase prepaidUseCase;
  private final AgreementPort agreementRepository;
  private final PricingCalculator pricingCalculator;
  private final AuditPort auditPort;
  private final RateWindowResolver rateWindowResolver;

  // -------------------------------------------------------------------------
  // ComplexPricingPort implementation
  // -------------------------------------------------------------------------

  @Override
  public PriceBreakdown calculate(
      ParkingSession session,
      OffsetDateTime exitAt,
      String agreementCode,
      boolean lostTicket,
      boolean dryRun) {

    // 1. Validate rate
    Rate rate = requireRate(session);

    // 2. Duration with grace period
    DurationCalculator.DurationBreakdown duration =
        DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());
    long billableMinutes = duration.billableMinutes();

    // 3. Monthly contract → zero-cost exit
    LocalDate date = exitAt.toLocalDate();
    boolean hasMonthly = monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            session.getPlate(), date, date, session.getCompanyId())
        .isPresent();

    if (hasMonthly) {
      if (!dryRun) {
        session.setMonthlySession(true);
      }
      return new PriceBreakdown(
          0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
    }

    // 4. Prepaid balance deduction (skip for lost-ticket)
    int deductedMinutes = 0;
    if (billableMinutes > 0 && !lostTicket) {
      List<PrepaidBalance> balances =
          prepaidBalanceRepository.findActiveByPlate(session.getPlate(), exitAt, session.getCompanyId());
      for (PrepaidBalance balance : balances) {
        int toDeduct = Math.min(balance.getRemainingMinutes(), (int) billableMinutes);
        if (toDeduct > 0) {
          if (!dryRun) {
            prepaidUseCase.deduct(balance.getId(), toDeduct);
          }
          billableMinutes -= toDeduct;
          deductedMinutes += toDeduct;
        }
        if (billableMinutes <= 0) break;
      }
    }
    if (!dryRun) {
      session.setAppliedPrepaidMinutes(deductedMinutes);
    }

    // 5. Base tariff calculation
    PriceBreakdown basePrice =
        pricingCalculator.calculate(rate, Math.max(0, billableMinutes), lostTicket);

    BigDecimal subtotal = basePrice.subtotal();
    BigDecimal surcharge = basePrice.surcharge();
    BigDecimal discount = BigDecimal.ZERO;
    
    // Apply Night Surcharge only when exit time falls inside the configured window
    if (rate.isAppliesNight()
        && rate.getNightSurchargePercent() != null
        && rate.getNightSurchargePercent().compareTo(BigDecimal.ZERO) > 0
        && rateWindowResolver.isInWindow(rate, exitAt)) {
      BigDecimal nightAdditional = subtotal.multiply(rate.getNightSurchargePercent())
          .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
      subtotal = subtotal.add(nightAdditional);
    }

    // Apply Holiday Surcharge (holiday resolution relies on the Rate.windowStart/windowEnd window too)
    if (rate.isAppliesHoliday()
        && rate.getHolidaySurchargePercent() != null
        && rate.getHolidaySurchargePercent().compareTo(BigDecimal.ZERO) > 0
        && rateWindowResolver.isInWindow(rate, exitAt)) {
      BigDecimal holidayAdditional = subtotal.multiply(rate.getHolidaySurchargePercent())
          .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
      subtotal = subtotal.add(holidayAdditional);
    }

    // 6. Corporate agreement
    String effectiveAgreement =
        (agreementCode != null && !agreementCode.isBlank())
            ? agreementCode.trim()
            : session.getAgreementCode();

    if (effectiveAgreement != null) {
      Optional<Agreement> agreement = agreementRepository.findByCodeAndIsActiveTrue(effectiveAgreement, session.getCompanyId());
      if (agreement.isPresent()) {
        Agreement a = agreement.get();
        if (!dryRun) {
          session.setAgreementCode(a.getCode());
        }
        if (a.getFlatAmount() != null) {
          subtotal = a.getFlatAmount();
        } else if (a.getDiscountPercent() != null
            && a.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
          discount = subtotal
              .multiply(a.getDiscountPercent())
              .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        }
        if (!dryRun) {
          auditPort.record(
              AuditAction.APLICAR_DESCUENTO,
              null,
              "No discount",
              "Discount applied: " + discount,
              "Agreement: " + effectiveAgreement + ", Ticket: " + session.getTicketNumber());
        }
      }
    }

    BigDecimal total = subtotal.add(surcharge).subtract(discount).max(BigDecimal.ZERO);

    BigDecimal taxPercentage = rate.getTaxPercentage() != null ? rate.getTaxPercentage() : BigDecimal.ZERO;
    BigDecimal taxAmount = BigDecimal.ZERO;
    BigDecimal netAmount = total;

    if (total.compareTo(BigDecimal.ZERO) > 0 && taxPercentage.compareTo(BigDecimal.ZERO) > 0) {
        if (rate.isTaxIncluded()) {
            BigDecimal divisor = BigDecimal.ONE.add(taxPercentage.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP));
            netAmount = total.divide(divisor, 2, java.math.RoundingMode.HALF_UP);
            taxAmount = total.subtract(netAmount);
        } else {
            taxAmount = netAmount.multiply(taxPercentage).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            total = netAmount.add(taxAmount);
        }
    }

    return new PriceBreakdown(
        basePrice.units(), subtotal, surcharge, discount, deductedMinutes, total, taxPercentage, taxAmount, netAmount);
  }

  @Override
  public PriceBreakdown applyCourtesy(
      ParkingSession session,
      PriceBreakdown computed,
      boolean lostTicketSettlement) {

    if (lostTicketSettlement) {
      return computed;
    }
    EntryMode mode = session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR;
    if (mode == EntryMode.VISITOR) {
      return computed;
    }
    // Non-visitor entries (SUBSCRIBER, AGREEMENT, etc.) exit at zero cost
    auditPort.record(
        AuditAction.APLICAR_CORTESIA,
        null,
        "Total: " + computed.total(),
        "Total: 0 (cortesía " + mode.name() + ")",
        "Ticket: " + session.getTicketNumber() + ", Monto exonerado: " + computed.total());
    return new PriceBreakdown(
        computed.units(),
        computed.subtotal(),
        computed.surcharge(),
        BigDecimal.ZERO,
        computed.deductedMinutes(),
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private Rate requireRate(ParkingSession session) {
    if (session.getRate() == null) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La sesión no tiene tarifa asignada");
    }
    return session.getRate();
  }
}
