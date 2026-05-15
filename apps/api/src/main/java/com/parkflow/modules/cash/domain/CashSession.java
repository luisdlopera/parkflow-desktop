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
@Table(name = "cash_session")
public class CashSession {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "cash_register_id")
  private CashRegister cashRegister;

  @ManyToOne(optional = false)
  @JoinColumn(name = "operator_id")
  private AppUser operator;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private CashSessionStatus status = CashSessionStatus.OPEN;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal openingAmount;

  @Column(nullable = false)
  private OffsetDateTime openedAt = OffsetDateTime.now();

  private OffsetDateTime closedAt;

  @ManyToOne
  @JoinColumn(name = "closed_by_id")
  private AppUser closedBy;

  @Column(precision = 14, scale = 2)
  private BigDecimal expectedAmount;

  @Column(precision = 14, scale = 2)
  private BigDecimal countedAmount;

  @Column(precision = 14, scale = 2)
  private BigDecimal differenceAmount;

  @Column(precision = 14, scale = 2)
  private BigDecimal countCash;

  @Column(precision = 14, scale = 2)
  private BigDecimal countCard;

  @Column(precision = 14, scale = 2)
  private BigDecimal countTransfer;

  @Column(precision = 14, scale = 2)
  private BigDecimal countOther;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(columnDefinition = "TEXT")
  private String closingNotes;

  /** Nombre de quien firma o valida físicamente el cierre (testigo/responsable adicional). */
  @Column(length = 200)
  private String closingWitnessName;

  private OffsetDateTime countedAt;

  @ManyToOne
  @JoinColumn(name = "count_operator_id")
  private AppUser countOperator;

  @Column(length = 120)
  private String openIdempotencyKey;

  @Column(length = 120)
  private String closeIdempotencyKey;

  /** Numero soporte PSC / consecutivo (si habilitado en parametros sede). */
  @Column(length = 120)
  private String supportDocumentNumber;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();
}
