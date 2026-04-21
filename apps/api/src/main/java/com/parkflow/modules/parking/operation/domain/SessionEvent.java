package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "session_event")
public class SessionEvent {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "session_id")
  private ParkingSession session;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SessionEventType type;

  @ManyToOne
  @JoinColumn(name = "actor_user_id")
  private AppUser actorUser;

  @Column(columnDefinition = "TEXT")
  private String metadata;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
