package com.parkflow.modules.settings.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "company_vehicle_type",
    uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "vehicle_type_id"}))
public class CompanyVehicleType {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "vehicle_type_id", nullable = false, insertable = false, updatable = false)
  private MasterVehicleType vehicleType;

  @Column(name = "vehicle_type_id", nullable = false)
  private UUID vehicleTypeId;

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(nullable = false)
  private int displayOrder = 0;

  private Boolean requiresPlate;
  private Boolean hasOwnRate;
  private Boolean quickAccess;
  private Boolean requiresPhoto;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
