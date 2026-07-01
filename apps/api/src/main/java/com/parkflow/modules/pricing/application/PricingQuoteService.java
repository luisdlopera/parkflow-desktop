package com.parkflow.modules.pricing.application;

import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.PrepaidBalancePort;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.pricing.domain.DefaultPricingEngine;
import com.parkflow.modules.pricing.domain.PricingContext;
import com.parkflow.modules.pricing.domain.PricingEngine;
import com.parkflow.modules.pricing.domain.PricingQuote;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PricingQuoteService {

    private final PricingEngine pricingEngine;
    private final MonthlyContractPort monthlyContractPort;
    private final PrepaidBalancePort prepaidBalancePort;
    private final AgreementPort agreementPort;

    public PricingQuoteService(
            MonthlyContractPort monthlyContractPort,
            PrepaidBalancePort prepaidBalancePort,
            AgreementPort agreementPort) {
        this.pricingEngine = new DefaultPricingEngine();
        this.monthlyContractPort = monthlyContractPort;
        this.prepaidBalancePort = prepaidBalancePort;
        this.agreementPort = agreementPort;
    }

    /**
     * Simulates a quote without making any state changes.
     */
    public PricingQuote simulate(ParkingSession session, OffsetDateTime exitAt, String overrideAgreementCode) {
        PricingContext context = buildContext(session, exitAt, overrideAgreementCode);
        return pricingEngine.calculate(context);
    }

    /**
     * Gets a real quote and validates it for billing.
     * Could optionally perform soft-locks or validations here.
     */
    public PricingQuote quoteForBilling(ParkingSession session, OffsetDateTime exitAt) {
        PricingContext context = buildContext(session, exitAt, session.getAgreementCode());
        return pricingEngine.calculate(context);
    }

    private PricingContext buildContext(ParkingSession session, OffsetDateTime exitAt, String agreementCode) {
        LocalDate exitDate = exitAt.toLocalDate();
        
        boolean hasMonthly = monthlyContractPort
            .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                session.getPlate(), exitDate, exitDate, session.getCompanyId()
            ).isPresent();

        List<PrepaidBalance> balances = prepaidBalancePort.findActiveByPlate(session.getPlate(), exitAt, session.getCompanyId());
        int availablePrepaidMinutes = balances.stream().mapToInt(PrepaidBalance::getRemainingMinutes).sum();

        String effectiveAgreement = (agreementCode != null && !agreementCode.isBlank()) ? agreementCode.trim() : session.getAgreementCode();
        java.math.BigDecimal agreementFlatAmount = null;
        java.math.BigDecimal agreementDiscountPercent = null;
        
        if (effectiveAgreement != null) {
            Optional<Agreement> agreement = agreementPort.findByCodeAndIsActiveTrue(effectiveAgreement, session.getCompanyId());
            if (agreement.isPresent()) {
                agreementFlatAmount = agreement.get().getFlatAmount();
                agreementDiscountPercent = agreement.get().getDiscountPercent();
            }
        }

        Rate rate = session.getRate();

        return new PricingContext(
            session.getEntryAt(),
            exitAt,
            rate,
            rate != null ? rate.getVehicleType() : null,
            effectiveAgreement,
            session.isLostTicket(),
            session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR,
            availablePrepaidMinutes,
            hasMonthly,
            agreementFlatAmount,
            agreementDiscountPercent
        );
    }
}
