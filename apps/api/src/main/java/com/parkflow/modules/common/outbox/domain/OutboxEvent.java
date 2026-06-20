package com.parkflow.modules.common.outbox.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "outbox_events")
@Getter
@Setter
public class OutboxEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "aggregate_type", nullable = false, length = 100)
  private String aggregateType;

  @Column(name = "aggregate_id", nullable = false, length = 255)
  private String aggregateId;

  @Column(name = "event_type", nullable = false, length = 100)
  private String eventType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> payload;

  @Column(name = "company_id")
  private UUID companyId;

  @Column(name = "processed_at")
  private OffsetDateTime processedAt;

  @Column(name = "failed_at")
  private OffsetDateTime failedAt;

  @Column(name = "failure_reason", columnDefinition = "TEXT")
  private String failureReason;

  @Column(name = "retry_count", nullable = false)
  private int retryCount = 0;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  public boolean isPending() {
    return processedAt == null && failedAt == null;
  }
}
