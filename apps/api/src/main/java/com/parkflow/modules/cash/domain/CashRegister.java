package com.parkflow.modules.cash.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "cash_register")
public class CashRegister {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, length = 80)
  private String site;

  @Column(nullable = false, length = 80)
  private String terminal;

  @Column(length = 120)
  private String label;

  @Column(nullable = false)
  private boolean active = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();
}
