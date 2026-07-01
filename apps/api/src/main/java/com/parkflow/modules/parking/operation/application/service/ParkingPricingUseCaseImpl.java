package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.parking.operation.application.port.in.ParkingPricingUseCase;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.pricing.application.PricingQuoteService;
import com.parkflow.modules.pricing.domain.PricingQuote;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class ParkingPricingUseCaseImpl implements ParkingPricingUseCase {

    private final PricingQuoteService pricingQuoteService;
    private final PrepaidUseCase prepaidUseCase;

    @Override
    public PriceBreakdown calculateComplexPrice(
        ParkingSession session, OffsetDateTime exitAt, String agreementCode, boolean lostTicket, boolean dryRun) {

        PricingQuote quote = dryRun ? 
            pricingQuoteService.simulate(session, exitAt, agreementCode) :
            pricingQuoteService.quoteForBilling(session, exitAt);

        if (!dryRun) {
            PriceBreakdown breakdown = quote.breakdown();
            if (breakdown.deductedMinutes() > 0) {
                // Here we set the applied minutes on the session for saving
                session.setAppliedPrepaidMinutes(breakdown.deductedMinutes());
            }
            if (session.getAgreementCode() != null && !session.getAgreementCode().equals(agreementCode)) {
                session.setAgreementCode(agreementCode);
                session.setEntryMode(EntryMode.AGREEMENT);
            }
        }

        return quote.breakdown();
    }

    @Override
    public PriceBreakdown applyCourtesyPricing(
        ParkingSession session, PriceBreakdown computed, boolean lostTicketSettlement) {
        if (lostTicketSettlement) return computed;
        EntryMode mode = session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR;
        if (mode == EntryMode.VISITOR) return computed;
        return new PriceBreakdown(
            computed.units(), computed.subtotal(), computed.surcharge(), BigDecimal.ZERO,
            computed.deductedMinutes(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }
}
