package com.parkflow.modules.settings.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "master_vehicle_type")
public class MasterVehicleType {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true)
  private String code;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false, length = 40)
  private String icon = "🚗";

  @Column(nullable = false, length = 20)
  private String color = "#2563EB";

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(nullable = false)
  private boolean requiresPlate = true;

  @Column(nullable = false)
  private boolean hasOwnRate = true;

  @Column(nullable = false)
  private boolean quickAccess = true;

  @Column(nullable = false)
  private boolean requiresPhoto = false;

  @Column(nullable = false)
  private int displayOrder = 0;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();
}
