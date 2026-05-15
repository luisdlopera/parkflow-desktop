package com.parkflow.modules.configuration.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "payment_methods")
public class PaymentMethod {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id")
  private UUID companyId;

  @Column(nullable = false, unique = true, length = 20)
  private String code;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(nullable = false)
  private boolean requiresReference = false;

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(nullable = false)
  private int displayOrder = 0;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
