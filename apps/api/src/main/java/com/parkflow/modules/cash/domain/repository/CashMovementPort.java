package com.parkflow.modules.cash.domain.repository;

import com.parkflow.modules.cash.domain.CashMovement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashMovementPort {
    List<CashMovement> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId);
    Optional<CashMovement> findByIdempotencyKey(String idempotencyKey);
    
    CashMovement save(CashMovement movement);
    Optional<CashMovement> findById(UUID id);
    void delete(CashMovement movement);
}
