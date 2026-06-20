package com.parkflow.modules.common.outbox.infrastructure;

import com.parkflow.modules.common.outbox.domain.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

  @Query("""
      SELECT e FROM OutboxEvent e
      WHERE e.processedAt IS NULL AND e.failedAt IS NULL
      ORDER BY e.createdAt ASC
      LIMIT 50
      """)
  List<OutboxEvent> findPendingBatch();
}
