package com.parkflow.modules.parking.operation.domain;

import com.parkflow.modules.auth.domain.AppUser;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@Builder(toBuilder = true)
@Entity
@Table(name = "parking_session", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"company_id", "ticket_number"})
})
public class ParkingSession extends org.springframework.data.domain.AbstractAggregateRoot<ParkingSession> {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @jakarta.persistence.Version
  private Long version;

  @Column(nullable = false)
  private String ticketNumber;

  @Column(length = 20)
  private String plate;

  @Column(nullable = false, length = 2)
  @Builder.Default
  private String countryCode = "CO";

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private EntryMode entryMode = EntryMode.VISITOR;

  @Column(nullable = false)
  @Builder.Default
  private boolean noPlate = false;

  @Column(length = 200)
  private String noPlateReason;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "vehicle_id")
  private Vehicle vehicle;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "rate_id")
  private Rate rate;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "entry_operator_id")
  private AppUser entryOperator;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "exit_operator_id")
  private AppUser exitOperator;

  @Column(nullable = false)
  @Builder.Default
  private OffsetDateTime entryAt = OffsetDateTime.now();

  private OffsetDateTime exitAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private SessionStatus status = SessionStatus.ACTIVE;

  private String entryNotes;

  @Column(nullable = false)
  @Builder.Default
  private boolean hasHelmet = false;

  private String exitNotes;

  @Column(name = "entry_image_url")
  private String entryImageUrl;

  @Column(name = "exit_image_url")
  private String exitImageUrl;

  @Enumerated(EnumType.STRING)
  @Column(name = "sync_status", nullable = false, length = 20)
  @Builder.Default
  private SessionSyncStatus syncStatus = SessionSyncStatus.SYNCED;

  @Column(nullable = false)
  @Builder.Default
  private boolean lostTicket = false;

  private String lostTicketReason;

  @Column(precision = 10, scale = 2)
  private BigDecimal totalAmount;

  @Column(name = "tax_amount", precision = 10, scale = 2)
  private BigDecimal taxAmount;

  @Column(name = "discount_amount", precision = 10, scale = 2)
  private BigDecimal discountAmount;

  @Column(name = "net_amount", precision = 10, scale = 2)
  private BigDecimal netAmount;

  @Column(name = "payment_method", length = 50)
  private String paymentMethod;

  @Column(length = 50)
  private String agreementCode;

  @Column(name = "applied_prepaid_minutes")
  @Builder.Default
  private Integer appliedPrepaidMinutes = 0;

  @Column(name = "is_monthly_session")
  @Builder.Default
  private boolean monthlySession = false;

  private String site;

  private String lane;

  private String booth;

  private String terminal;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Column(nullable = false)
  @Builder.Default
  private int reprintCount = 0;

  @Column(nullable = false)
  @Builder.Default
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  @Builder.Default
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
