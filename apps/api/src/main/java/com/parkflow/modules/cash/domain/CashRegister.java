package com.parkflow.modules.cash.domain;

import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.Printer;
import com.parkflow.modules.auth.domain.AppUser;
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

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "site_id")
  private ParkingSite siteRef;

  @Column(nullable = false, length = 80)
  private String terminal;

  @Column(length = 20)
  private String code;

  @Column(length = 120)
  private String label;

  @Column(length = 120)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "printer_id")
  private Printer printer;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "responsible_user_id")
  private AppUser responsibleUser;

  @Column(nullable = false)
  private boolean active = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
