package com.parkflow.modules.sync.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "sync_events")
public class SyncEvent {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true)
  private String idempotencyKey;

  @Column(nullable = false)
  private String eventType;

  @Column(nullable = false)
  private String aggregateId;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String payloadJson;

  private String userId;

  private String deviceId;

  private String sessionId;

  @Column(nullable = false)
  private String origin = "ONLINE";

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SyncDirection direction;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  private OffsetDateTime syncedAt;
}
