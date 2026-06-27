package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.repository.CashMovementPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CashMovementJpaAdapter implements CashMovementPort {

    private final CashMovementRepository cashMovementRepository;

    @Override
    public List<CashMovement> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId) {
        return cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(cashSessionId);
    }

    @Override
    public List<CashMovement> findPostedByParkingSessionId(UUID parkingSessionId) {
        return cashMovementRepository.findPostedByParkingSessionId(parkingSessionId);
    }

    @Override
    public List<CashMovement> findByCashSessionIdFetchAllOrderByCreatedAtDesc(UUID cashSessionId) {
        return cashMovementRepository.findByCashSessionIdFetchAllOrderByCreatedAtDesc(cashSessionId);
    }

    @Override
    public Optional<CashMovement> findByIdempotencyKey(String idempotencyKey) {
        return cashMovementRepository.findByIdempotencyKey(idempotencyKey);
    }

    @Override
    public CashMovement save(CashMovement movement) {
        return cashMovementRepository.save(movement);
    }

    @Override
    public Optional<CashMovement> findById(UUID id) {
        return cashMovementRepository.findById(id);
    }

    @Override
    public void delete(CashMovement movement) {
        cashMovementRepository.delete(movement);
    }
}
