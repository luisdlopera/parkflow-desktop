package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessionEventRepository extends JpaRepository<SessionEvent, UUID> {

  @Query(
      "SELECT COUNT(e) FROM SessionEvent e WHERE e.type = :type AND e.createdAt >= :from")
  long countByTypeAndCreatedAtFrom(
      @Param("type") SessionEventType type, @Param("from") OffsetDateTime from);
}
