package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;

import java.util.UUID;

public interface VoidCashMovementUseCase {
    CashMovementResponse voidMovement(UUID sessionId, UUID movementId, VoidMovementRequest request);
}
