package com.parkflow.modules.parking.spaces.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
    name = "parking_space",
    uniqueConstraints = {@UniqueConstraint(name = "uq_parking_space_company_code", columnNames = {"company_id", "code"})})
public class ParkingSpace {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Column(nullable = false, length = 30)
  private String code;

  @Column(length = 80)
  private String label;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private ParkingSpaceType type = ParkingSpaceType.GENERAL;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private ParkingSpaceStatus status = ParkingSpaceStatus.ACTIVE;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder = 0;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
