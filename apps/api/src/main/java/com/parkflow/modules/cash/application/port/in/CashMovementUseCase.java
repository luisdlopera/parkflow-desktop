package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Payment;

import java.util.List;
import java.util.UUID;

public interface CashMovementUseCase {
    CashMovementResponse addMovement(UUID sessionId, CashMovementRequest request);
    CashMovementResponse voidMovement(UUID sessionId, UUID movementId, VoidMovementRequest request);
    List<CashMovementResponse> listMovements(UUID sessionId);
    
    // Integration methods for other modules
    void assertCashOpenForParkingPayment(ParkingSession parkingSession);
    void recordParkingPayment(
        ParkingSession parkingSession,
        Payment payment,
        AppUser operator,
        String idempotencyKey,
        CashMovementType movementType);
}
