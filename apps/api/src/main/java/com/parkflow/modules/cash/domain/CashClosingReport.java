package com.parkflow.modules.cash.domain;

import com.parkflow.modules.auth.domain.AppUser;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "cash_closing_report")
public class CashClosingReport {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @OneToOne(optional = false)
  @JoinColumn(name = "cash_session_id")
  private CashSession cashSession;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal totalCash;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal totalCard;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal totalTransfer;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal totalOther;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal expectedTotal;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal countedTotal;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal difference;

  @Column(columnDefinition = "TEXT")
  private String observations;

  @Column(nullable = false)
  private OffsetDateTime generatedAt = OffsetDateTime.now();

  @ManyToOne(optional = false)
  @JoinColumn(name = "generated_by_id")
  private AppUser generatedBy;
}
