package com.parkflow.modules.sync.repository;

import com.parkflow.modules.sync.entity.SyncEvent;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncEventRepository extends JpaRepository<SyncEvent, UUID> {
  Optional<SyncEvent> findByIdempotencyKeyAndCompanyId(String idempotencyKey, UUID companyId);

  List<SyncEvent> findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID companyId, OffsetDateTime createdAt);

  long countByCompanyIdAndSyncedAtIsNull(UUID companyId);

  Optional<SyncEvent> findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(UUID companyId);
}
