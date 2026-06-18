package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Payment;

import java.util.UUID;

public interface ParkingCashIntegrationUseCase {
    default void assertCashOpenForParkingPayment(ParkingSession parkingSession) {
        assertCashOpenForParkingPayment(parkingSession, null);
    }
    
    void assertCashOpenForParkingPayment(ParkingSession parkingSession, UUID cashSessionId);
    
    default void recordParkingPayment(
        ParkingSession parkingSession,
        Payment payment,
        AppUser operator,
        String idempotencyKey,
        CashMovementType movementType) {
        recordParkingPayment(parkingSession, payment, operator, idempotencyKey, movementType, null);
    }
    
    void recordParkingPayment(
        ParkingSession parkingSession,
        Payment payment,
        AppUser operator,
        String idempotencyKey,
        CashMovementType movementType,
        UUID cashSessionId);
}
