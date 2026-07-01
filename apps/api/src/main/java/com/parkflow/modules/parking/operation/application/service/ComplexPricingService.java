package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.pricing.application.PricingQuoteService;
import com.parkflow.modules.pricing.domain.ExecutionStep;
import com.parkflow.modules.pricing.domain.PricingQuote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Delegator service that routes legacy ComplexPricingPort calls
 * to the new unified PricingQuoteService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ComplexPricingService implements ComplexPricingPort {

    private final PricingQuoteService pricingQuoteService;
    private final PrepaidUseCase prepaidUseCase;
    private final AuditPort auditPort;

    @Override
    public PriceBreakdown calculate(
        ParkingSession session,
        OffsetDateTime exitAt,
        String agreementCode,
        boolean lostTicket,
        boolean dryRun) {

        // Use the new Unified Pricing Engine
        PricingQuote quote = dryRun ? 
            pricingQuoteService.simulate(session, exitAt, agreementCode) :
            pricingQuoteService.quoteForBilling(session, exitAt);

        // Apply Side Effects for actual billing
        if (!dryRun) {
            PriceBreakdown breakdown = quote.breakdown();
            
            // Deduct prepaid
            if (breakdown.deductedMinutes() > 0) {
                // We need to deduct from actual balances.
                // The new engine calculates how many minutes should be deducted,
                // but we need to call prepaidUseCase here since PricingQuoteService is read-only.
                // For simplicity in the migration, we let the actual exit service handle deductions 
                // or we do it here:
                session.setAppliedPrepaidMinutes(breakdown.deductedMinutes());
                // Note: Actual deduction logic from balances requires balance IDs.
                // The new engine should ideally return the balances used in the trace.
            }
            
            // Log discounts
            if (breakdown.discount().compareTo(BigDecimal.ZERO) > 0) {
                auditPort.record(
                    AuditAction.APLICAR_DESCUENTO,
                    null,
                    "No discount",
                    "Discount applied: " + breakdown.discount(),
                    "Agreement: " + agreementCode + ", Ticket: " + session.getTicketNumber());
            }

            // Log trace for audit
            log.info("Execution Trace for Session {}: {}", session.getId(), quote.trace());
        }

        return quote.breakdown();
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
}
