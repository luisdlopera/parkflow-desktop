package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "vehicle_condition_report")
public class VehicleConditionReport {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "session_id")
  private ParkingSession session;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ConditionStage stage;

  private String observations;

  @Column(columnDefinition = "TEXT")
  private String checklistJson;

  @Column(columnDefinition = "TEXT")
  private String photoUrlsJson;

  @ManyToOne
  @JoinColumn(name = "created_by_id")
  private AppUser createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
