package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperationIdempotencyRepository extends JpaRepository<OperationIdempotency, UUID> {
  Optional<OperationIdempotency> findByIdempotencyKey(String idempotencyKey);
}
