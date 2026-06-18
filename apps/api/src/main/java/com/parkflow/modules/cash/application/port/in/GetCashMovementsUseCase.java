package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashMovementResponse;

import java.util.List;
import java.util.UUID;

public interface GetCashMovementsUseCase {
    List<CashMovementResponse> listMovements(UUID sessionId);
}
