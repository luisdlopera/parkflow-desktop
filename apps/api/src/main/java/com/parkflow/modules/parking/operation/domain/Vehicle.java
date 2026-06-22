package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
    name = "vehicle",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"company_id", "plate"}, name = "uq_vehicle_company_plate")
    }
)
@SQLRestriction("deleted_at IS NULL")
public class Vehicle {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Column(nullable = false, length = 20)
  private String plate;

  @Column(nullable = false)
  private String type;

  @Column(name = "vehicle_type_id")
  private UUID vehicleTypeId;

  @Column(name = "client_id")
  private UUID clientId;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  private OffsetDateTime deletedAt;

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }

  public boolean isDeleted() {
    return deletedAt != null;
  }
}
