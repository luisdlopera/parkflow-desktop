package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import java.util.Optional;
import java.util.UUID;

public interface OperationIdempotencyPort {
  Optional<OperationIdempotency> findByIdempotencyKey(String idempotencyKey);
  OperationIdempotency save(OperationIdempotency idempotency);
  Optional<OperationIdempotency> findById(UUID id);
}
