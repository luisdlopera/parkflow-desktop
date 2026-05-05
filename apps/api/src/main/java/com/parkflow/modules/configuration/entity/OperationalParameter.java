package com.parkflow.modules.configuration.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "operational_parameters")
public class OperationalParameter {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @OneToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "site_id", nullable = false, unique = true)
  private ParkingSite site;

  @Column(nullable = false)
  private boolean allowEntryWithoutPrinter = false;

  @Column(nullable = false)
  private boolean allowExitWithoutPayment = false;

  @Column(nullable = false)
  private boolean allowReprint = true;

  @Column(nullable = false)
  private boolean allowVoid = true;

  @Column(nullable = false)
  private boolean requirePhotoEntry = false;

  @Column(nullable = false)
  private boolean requirePhotoExit = false;

  @Column(nullable = false)
  private int toleranceMinutes = 0;

  @Column(nullable = false)
  private int maxTimeNoCharge = 0;

  @Column(columnDefinition = "TEXT")
  private String legalMessage;

  @Column(nullable = false)
  private boolean offlineModeEnabled = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
