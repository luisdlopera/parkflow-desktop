package com.parkflow.modules.parking.operation.domain;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.infrastructure.persistence.StringListConverter;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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

  @Convert(converter = StringListConverter.class)
  @Column(name = "checklist_json", columnDefinition = "TEXT")
  private List<String> checklist = new ArrayList<>();

  @Convert(converter = StringListConverter.class)
  @Column(name = "photo_urls_json", columnDefinition = "TEXT")
  private List<String> photoUrls = new ArrayList<>();

  @ManyToOne
  @JoinColumn(name = "created_by_id")
  private AppUser createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
