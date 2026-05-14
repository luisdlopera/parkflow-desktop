package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "app_user")
public class AppUser {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id")
  private UUID companyId;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserRole role;

  @Column(nullable = false)
  private boolean isActive = true;

  private String document;
  private String phone;
  private String site;
  private String terminal;

  private OffsetDateTime lastAccessAt;
  private OffsetDateTime passwordChangedAt;

  @Column(nullable = false)
  private boolean canVoidTickets = false;

  @Column(nullable = false)
  private boolean canReprintTickets = false;

  @Column(nullable = false)
  private boolean canCloseCash = false;

  @Column(nullable = false)
  private boolean requirePasswordChange = false;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
