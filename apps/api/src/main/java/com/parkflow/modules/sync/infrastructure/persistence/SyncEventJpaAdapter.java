package com.parkflow.modules.sync.infrastructure.persistence;

import com.parkflow.modules.sync.domain.SyncEvent;
import com.parkflow.modules.sync.domain.repository.SyncEventPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SyncEventJpaAdapter implements SyncEventPort {

    private final SyncEventJpaRepository jpaRepository;

    @Override
    public long countByCompanyIdAndSyncedAtIsNull(UUID companyId) {
        return jpaRepository.countByCompanyIdAndSyncedAtIsNull(companyId);
    }

    @Override
    public Optional<SyncEvent> findByIdempotencyKeyAndCompanyId(String idempotencyKey, UUID companyId) {
        return jpaRepository.findByIdempotencyKeyAndCompanyId(idempotencyKey, companyId);
    }

    @Override
    public List<SyncEvent> findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID companyId, OffsetDateTime after) {
        return jpaRepository.findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(companyId, after);
    }

    @Override
    public Optional<SyncEvent> findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(UUID companyId) {
        return jpaRepository.findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(companyId);
    }

    @Override
    public SyncEvent save(SyncEvent event) {
        return jpaRepository.save(event);
    }

    @Override
    public Optional<SyncEvent> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Repository
    interface SyncEventJpaRepository extends JpaRepository<SyncEvent, UUID> {
        long countByCompanyIdAndSyncedAtIsNull(UUID companyId);

        Optional<SyncEvent> findByIdempotencyKeyAndCompanyId(String idempotencyKey, UUID companyId);

        List<SyncEvent> findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID companyId, OffsetDateTime after);

        Optional<SyncEvent> findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(UUID companyId);
    }
}
