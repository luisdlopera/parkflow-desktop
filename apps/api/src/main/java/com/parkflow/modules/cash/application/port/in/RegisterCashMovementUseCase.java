package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;

import java.util.UUID;

public interface RegisterCashMovementUseCase {
    CashMovementResponse addMovement(UUID sessionId, CashMovementRequest request);
}
