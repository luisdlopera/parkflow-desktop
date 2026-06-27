package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.application.port.out.AgreementPort;
import com.parkflow.modules.configuration.application.port.out.MonthlyContractPort;
import com.parkflow.modules.configuration.application.port.out.PrepaidBalancePort;
import com.parkflow.modules.parking.operation.application.port.in.ParkingPricingUseCase;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.pricing.PricingCalculator;
import com.parkflow.modules.common.exception.OperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ParkingPricingUseCaseImpl implements ParkingPricingUseCase {

    private final MonthlyContractPort monthlyContractPort;
    private final PrepaidBalancePort prepaidBalancePort;
    private final PrepaidUseCase prepaidUseCase;
    private final AgreementPort agreementPort;
    private final PricingCalculator pricingCalculator;

    @Override
    public PriceBreakdown calculateComplexPrice(
        ParkingSession session, OffsetDateTime exitAt, String agreementCode, boolean lostTicket, boolean dryRun) {

        Rate rate = requireRate(session);
        DurationCalculator.DurationBreakdown duration =
            DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());

        long billableMinutes = duration.billableMinutes();

        LocalDate date = exitAt.toLocalDate();
        boolean hasMonthly = monthlyContractPort
            .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                session.getPlate(), date, date, session.getCompanyId()).isPresent();

        if (hasMonthly) {
            session.setMonthlySession(true);
            return new PriceBreakdown(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        }

        int deductedMinutes = 0;
        if (billableMinutes > 0 && !lostTicket) {
            List<PrepaidBalance> balances = prepaidBalancePort.findActiveByPlate(
                session.getPlate(), exitAt, session.getCompanyId());
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

        PriceBreakdown basePrice =
            pricingCalculator.calculate(rate, Math.max(0, billableMinutes), lostTicket);

        BigDecimal subtotal = basePrice.subtotal();
        BigDecimal surcharge = basePrice.surcharge();
        BigDecimal discount = BigDecimal.ZERO;

        String effectiveAgreement = agreementCode != null && !agreementCode.isBlank()
            ? agreementCode.trim() : session.getAgreementCode();
        if (effectiveAgreement != null) {
            Optional<Agreement> agreement = agreementPort.findByCodeAndIsActiveTrueAndCompanyId(
                effectiveAgreement, session.getCompanyId());
            if (agreement.isPresent()) {
                Agreement a = agreement.get();
                session.setAgreementCode(a.getCode());
                if (a.getFlatAmount() != null) {
                    subtotal = a.getFlatAmount();
                } else if (a.getDiscountPercent() != null
                    && a.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                    discount = subtotal.multiply(a.getDiscountPercent())
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                }
                if (!dryRun) {
                    session.setEntryMode(EntryMode.AGREEMENT);
                }
            }
        }

        BigDecimal total = subtotal.add(surcharge).subtract(discount).max(BigDecimal.ZERO);
        return new PriceBreakdown(basePrice.units(), subtotal, surcharge, discount, deductedMinutes, total);
    }

    @Override
    public PriceBreakdown applyCourtesyPricing(
        ParkingSession session, PriceBreakdown computed, boolean lostTicketSettlement) {
        if (lostTicketSettlement) return computed;
        EntryMode mode = session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR;
        if (mode == EntryMode.VISITOR) return computed;
        return new PriceBreakdown(
            computed.units(), computed.subtotal(), computed.surcharge(), BigDecimal.ZERO,
            computed.deductedMinutes(), BigDecimal.ZERO);
    }

    private Rate requireRate(ParkingSession session) {
        if (session.getRate() == null) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "La sesión no tiene tarifa asignada");
        }
        return session.getRate();
    }
}
