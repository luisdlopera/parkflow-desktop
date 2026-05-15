package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashAuditLog;
import com.parkflow.modules.cash.domain.repository.CashAuditLogPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CashAuditLogJpaAdapter implements CashAuditLogPort {

    private final CashAuditLogJpaRepository jpaRepository;

    @Override
    public List<CashAuditLog> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId) {
        return jpaRepository.findByCashSession_IdOrderByCreatedAtDesc(cashSessionId);
    }

    @Override
    public CashAuditLog save(CashAuditLog log) {
        return jpaRepository.save(log);
    }

    @Override
    public Optional<CashAuditLog> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public void delete(CashAuditLog log) {
        jpaRepository.delete(log);
    }

    @Repository
    interface CashAuditLogJpaRepository extends JpaRepository<CashAuditLog, UUID> {
        List<CashAuditLog> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId);
    }
}
