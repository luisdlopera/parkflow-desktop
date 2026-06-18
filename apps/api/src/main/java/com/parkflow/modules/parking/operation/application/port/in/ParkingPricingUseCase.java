package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;

import java.time.OffsetDateTime;

public interface ParkingPricingUseCase {
    PriceBreakdown calculateComplexPrice(
        ParkingSession session, 
        OffsetDateTime exitAt, 
        String agreementCode, 
        boolean lostTicket, 
        boolean dryRun);
        
    PriceBreakdown applyCourtesyPricing(
        ParkingSession session, 
        PriceBreakdown computed, 
        boolean lostTicketSettlement);
}
