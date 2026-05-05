package com.parkflow.modules.configuration.entity;

import com.parkflow.modules.licensing.entity.Company;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "parking_sites")
public class ParkingSite {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  @Column(nullable = false, unique = true, length = 20)
  private String code;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(length = 300)
  private String address;

  @Column(length = 100)
  private String city;

  @Column(length = 50)
  private String phone;

  @Column(length = 150)
  private String managerName;

  @Column(nullable = false, length = 50)
  private String timezone = "America/Bogota";

  @Column(nullable = false, length = 10)
  private String currency = "COP";

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
