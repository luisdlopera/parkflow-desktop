package com.parkflow.modules.parking.operation.domain;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import com.parkflow.modules.parking.operation.domain.event.*;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
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

  // -------------------------------------------------------------------------
  // Domain behaviour — all state transitions go through these methods
  // -------------------------------------------------------------------------

  /**
   * Close a session after a vehicle exits. Encapsulates all field mutations so
   * invariants (e.g. can only close an ACTIVE session) are enforced by the aggregate.
   */
  public void close(AppUser operator, OffsetDateTime exitAt,
                    PriceBreakdown price, String notes, String imageUrl) {
    if (this.status != SessionStatus.ACTIVE) {
      throw new BusinessValidationException("SESSION_NOT_ACTIVE",
          "Solo se puede cerrar una sesión activa. Estado actual: " + status);
    }
    this.exitAt = exitAt;
    this.exitOperator = operator;
    this.exitNotes = notes;
    this.exitImageUrl = imageUrl;
    this.status = SessionStatus.CLOSED;
    this.totalAmount = price.total();
    this.discountAmount = price.discount();
    this.appliedPrepaidMinutes = price.deductedMinutes();
    this.syncStatus = SessionSyncStatus.PENDING;
    this.updatedAt = OffsetDateTime.now();
    registerEvent(new SessionClosedEvent(this, operator, price.total()));
  }

  /**
   * Cancel (void) a session. Can only be done before a session is fully closed.
   */
  public void cancel(AppUser operator, String reason) {
    if (this.status == SessionStatus.CLOSED || this.status == SessionStatus.CANCELED) {
      throw new BusinessValidationException("SESSION_ALREADY_TERMINAL",
          "No se puede anular una sesión en estado " + status);
    }
    this.status = SessionStatus.CANCELED;
    this.exitNotes = reason;
    this.updatedAt = OffsetDateTime.now();
    registerEvent(new SessionVoidedEvent(this, operator, reason));
  }

  /**
   * Process a lost ticket exit — charges a surcharge, closes session as LOST_TICKET.
   */
  public void processLostTicket(AppUser operator, OffsetDateTime exitAt,
                                 PriceBreakdown price, String reason, String imageUrl) {
    if (this.status != SessionStatus.ACTIVE) {
      throw new BusinessValidationException("SESSION_NOT_ACTIVE",
          "Solo se puede procesar ticket perdido de una sesión activa");
    }
    this.lostTicket = true;
    this.lostTicketReason = reason;
    this.exitAt = exitAt;
    this.exitOperator = operator;
    this.exitImageUrl = imageUrl;
    this.status = SessionStatus.LOST_TICKET;
    this.totalAmount = price.total();
    this.appliedPrepaidMinutes = price.deductedMinutes();
    this.syncStatus = SessionSyncStatus.SYNCED;
    this.updatedAt = OffsetDateTime.now();
    registerEvent(new SessionLostTicketEvent(this, operator, price.total(), reason));
  }

  /**
   * Correct a plate number on an active session. Returns the old plate for audit.
   */
  public String correctPlate(String newPlate) {
    if (this.status != SessionStatus.ACTIVE) {
      throw new BusinessValidationException("SESSION_NOT_ACTIVE",
          "Solo se puede corregir la placa de una sesión activa");
    }
    String oldPlate = this.plate;
    this.plate = newPlate;
    this.updatedAt = OffsetDateTime.now();
    return oldPlate;
  }

  /**
   * Increment the reprint counter. Returns the new count.
   */
  public int incrementReprint() {
    this.reprintCount++;
    this.updatedAt = OffsetDateTime.now();
    registerEvent(new TicketReprintedEvent(this, null, reprintCount, null));
    return this.reprintCount;
  }
}
