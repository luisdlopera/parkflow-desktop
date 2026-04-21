package com.parkflow.modules.sync.repository;

import com.parkflow.modules.sync.entity.SyncEvent;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncEventRepository extends JpaRepository<SyncEvent, UUID> {
  Optional<SyncEvent> findByIdempotencyKey(String idempotencyKey);

  List<SyncEvent> findByCreatedAtAfterOrderByCreatedAtAsc(OffsetDateTime createdAt);
}
