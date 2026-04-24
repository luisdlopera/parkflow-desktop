package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashMovement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashMovementRepository extends JpaRepository<CashMovement, UUID> {
  List<CashMovement> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId);

  Optional<CashMovement> findByIdempotencyKey(String idempotencyKey);
}
