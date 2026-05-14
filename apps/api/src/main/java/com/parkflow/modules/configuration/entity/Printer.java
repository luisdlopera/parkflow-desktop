package com.parkflow.modules.configuration.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "printers")
public class Printer {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id")
  private UUID companyId;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "site_id", nullable = false)
  private ParkingSite site;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(nullable = false, length = 20)
  @Enumerated(EnumType.STRING)
  private PrinterType type = PrinterType.THERMAL;

  @Column(nullable = false, length = 20)
  @Enumerated(EnumType.STRING)
  private PrinterConnection connection = PrinterConnection.USB;

  @Column(nullable = false)
  private int paperWidthMm = 80;

  @Column(length = 255)
  private String endpointOrDevice;

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(nullable = false)
  private boolean isDefault = false;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }

  public enum PrinterType {
    THERMAL, PDF, OS
  }

  public enum PrinterConnection {
    USB, NET, BLUETOOTH, LOCAL_AGENT
  }
}
