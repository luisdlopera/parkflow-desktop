package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.repository.CashMovementPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CashMovementJpaAdapter implements CashMovementPort {

    private final CashMovementJpaRepository jpaRepository;

    @Override
    public List<CashMovement> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId) {
        return jpaRepository.findByCashSession_IdOrderByCreatedAtDesc(cashSessionId);
    }

    @Override
    public Optional<CashMovement> findByIdempotencyKey(String idempotencyKey) {
        return jpaRepository.findByIdempotencyKey(idempotencyKey);
    }

    @Override
    public CashMovement save(CashMovement movement) {
        return jpaRepository.save(movement);
    }

    @Override
    public Optional<CashMovement> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public void delete(CashMovement movement) {
        jpaRepository.delete(movement);
    }

    @Repository
    interface CashMovementJpaRepository extends JpaRepository<CashMovement, UUID> {
        List<CashMovement> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId);

        Optional<CashMovement> findByIdempotencyKey(String idempotencyKey);
    }
}
