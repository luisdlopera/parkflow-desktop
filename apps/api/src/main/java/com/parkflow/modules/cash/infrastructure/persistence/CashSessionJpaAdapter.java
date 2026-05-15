package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.domain.repository.CashSessionPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CashSessionJpaAdapter implements CashSessionPort {

    private final CashSessionJpaRepository jpaRepository;

    @Override
    public Optional<CashSession> findByOpenIdempotencyKey(String key) {
        return jpaRepository.findByOpenIdempotencyKey(key);
    }

    @Override
    public Optional<CashSession> findByCloseIdempotencyKey(String key) {
        return jpaRepository.findByCloseIdempotencyKey(key);
    }

    @Override
    public Optional<CashSession> findByRegisterAndStatus(UUID registerId, CashSessionStatus status) {
        return jpaRepository.findByCashRegister_IdAndStatus(registerId, status);
    }

    @Override
    public Optional<CashSession> findOpenForSiteTerminal(String site, String terminal, CashSessionStatus status) {
        return jpaRepository.findOpenForSiteTerminal(site, terminal, status);
    }

    @Override
    public Optional<CashSession> fetchForClosingWebhook(UUID id) {
        return jpaRepository.fetchForClosingWebhook(id);
    }

    @Override
    public long countByStatus(CashSessionStatus status) {
        return jpaRepository.countByStatus(status);
    }

    @Override
    public Page<CashSession> findAllByOrderByOpenedAtDesc(Pageable pageable) {
        return jpaRepository.findAllByOrderByOpenedAtDesc(pageable);
    }

    @Override
    public CashSession save(CashSession session) {
        return jpaRepository.save(session);
    }

    @Override
    public Optional<CashSession> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public void delete(CashSession session) {
        jpaRepository.delete(session);
    }

    @Repository
    interface CashSessionJpaRepository extends JpaRepository<CashSession, UUID> {
        Optional<CashSession> findByOpenIdempotencyKey(String openIdempotencyKey);

        Optional<CashSession> findByCloseIdempotencyKey(String closeIdempotencyKey);

        Optional<CashSession> findByCashRegister_IdAndStatus(UUID registerId, CashSessionStatus status);

        @Query("SELECT s FROM CashSession s WHERE s.cashRegister.site = :site " +
               "AND s.cashRegister.terminal = :terminal AND s.status = :status")
        Optional<CashSession> findOpenForSiteTerminal(
            @Param("site") String site, @Param("terminal") String terminal, @Param("status") CashSessionStatus status);

        @Query("SELECT s FROM CashSession s JOIN FETCH s.cashRegister WHERE s.id = :id")
        Optional<CashSession> fetchForClosingWebhook(@Param("id") UUID id);

        long countByStatus(CashSessionStatus status);

        Page<CashSession> findAllByOrderByOpenedAtDesc(Pageable pageable);
    }
}
