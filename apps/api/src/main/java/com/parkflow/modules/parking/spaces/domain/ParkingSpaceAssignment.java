package com.parkflow.modules.parking.spaces.domain;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "parking_space_assignment")
public class ParkingSpaceAssignment {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "parking_space_id", nullable = false)
  private ParkingSpace parkingSpace;

  @OneToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "parking_session_id", nullable = false, unique = true)
  private ParkingSession parkingSession;

  @Column(name = "assigned_at", nullable = false)
  private OffsetDateTime assignedAt = OffsetDateTime.now();

  @Column(name = "released_at")
  private OffsetDateTime releasedAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private ParkingSpaceAssignmentStatus status = ParkingSpaceAssignmentStatus.ACTIVE;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
