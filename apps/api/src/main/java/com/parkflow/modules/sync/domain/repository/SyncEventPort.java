package com.parkflow.modules.sync.domain.repository;

import com.parkflow.modules.sync.domain.SyncEvent;
import java.util.Optional;
import java.util.UUID;

public interface SyncEventPort {
    long countByCompanyIdAndSyncedAtIsNull(UUID companyId);

    Optional<SyncEvent> findByIdempotencyKeyAndCompanyId(String idempotencyKey, UUID companyId);

    java.util.List<SyncEvent> findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID companyId, java.time.OffsetDateTime after);

    Optional<SyncEvent> findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(UUID companyId);

    SyncEvent save(SyncEvent event);
    Optional<SyncEvent> findById(UUID id);
}
