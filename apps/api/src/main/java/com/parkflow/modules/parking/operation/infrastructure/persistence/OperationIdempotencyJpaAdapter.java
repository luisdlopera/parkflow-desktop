package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OperationIdempotencyJpaAdapter implements OperationIdempotencyPort {

  private final OperationIdempotencyJpaRepository jpaRepository;

  @Override
  public Optional<OperationIdempotency> findByIdempotencyKey(String idempotencyKey) {
    return jpaRepository.findByIdempotencyKey(idempotencyKey);
  }

  @Override
  public OperationIdempotency save(OperationIdempotency idempotency) {
    return jpaRepository.save(idempotency);
  }

  @Override
  public Optional<OperationIdempotency> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface OperationIdempotencyJpaRepository extends JpaRepository<OperationIdempotency, UUID> {
    Optional<OperationIdempotency> findByIdempotencyKey(String idempotencyKey);
  }
}
