package com.parkflow.modules.parking.operation.domain;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.configuration.domain.Rate;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Getter
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

  @Column(nullable = false, length = 20)
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

  @ManyToOne(optional = false)
  @JoinColumn(name = "vehicle_id")
  private Vehicle vehicle;

  @ManyToOne
  @JoinColumn(name = "rate_id")
  private Rate rate;

  @ManyToOne
  @JoinColumn(name = "entry_operator_id")
  private AppUser entryOperator;

  @ManyToOne
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

  @Column(precision = 10, scale = 2)
  private BigDecimal taxAmount;

  @Column(precision = 10, scale = 2)
  private BigDecimal discountAmount;

  @Column(precision = 10, scale = 2)
  private BigDecimal netAmount;

  private String paymentMethod;

  @Column(name = "site_code")
  private String site;

  private String lane;

  private String booth;

  private String terminal;

  @Column(nullable = false)
  private UUID companyId;

  @Column(nullable = false)
  @Builder.Default
  private boolean isMonthlySession = false;

  @Column(nullable = false)
  @Builder.Default
  private int reprintCount = 0;

  @Column(length = 50)
  private String agreementCode;

  @Column(nullable = false)
  @Builder.Default
  private int appliedPrepaidMinutes = 0;

  @Column(nullable = false)
  @Builder.Default
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  @Builder.Default
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  public static ParkingSession createEntry(
      UUID companyId,
      String ticketNumber,
      String plate,
      boolean noPlate,
      String noPlateReason,
      String countryCode,
      EntryMode entryMode,
      boolean isMonthlySession,
      Vehicle vehicle,
      Rate rate,
      AppUser entryOperator,
      OffsetDateTime entryAt,
      String site,
      String lane,
      String booth,
      String terminal,
      String entryNotes,
      String entryImageUrl
  ) {
      ParkingSession session = new ParkingSession();
      session.companyId = companyId;
      session.ticketNumber = ticketNumber;
      session.plate = plate;
      session.noPlate = noPlate;
      session.noPlateReason = noPlateReason;
      session.countryCode = countryCode;
      session.entryMode = entryMode;
      session.isMonthlySession = isMonthlySession;
      session.vehicle = vehicle;
      session.rate = rate;
      session.entryOperator = entryOperator;
      session.entryAt = entryAt;
      session.site = site;
      session.lane = lane;
      session.booth = booth;
      session.terminal = terminal;
      session.entryNotes = entryNotes;
      session.entryImageUrl = entryImageUrl;
      session.status = SessionStatus.ACTIVE;
      session.syncStatus = SessionSyncStatus.SYNCED;
      
      session.registerEvent(new com.parkflow.modules.parking.operation.domain.event.SessionCreatedEvent(session, entryOperator));
      
      return session;
  }

  // -------------------------------------------------------------------------
  // Domain Methods (Business Logic)
  // -------------------------------------------------------------------------

  /**
   * Marks this session as a monthly subscriber session.
   */
  public void markAsMonthlySession() {
    this.isMonthlySession = true;
    this.updatedAt = OffsetDateTime.now();
  }

  /**
   * Applies prepaid minutes deduction to this session.
   */
  public void applyPrepaidMinutes(int minutes) {
    this.appliedPrepaidMinutes = minutes;
    this.updatedAt = OffsetDateTime.now();
  }

  /**
   * Applies a corporate agreement to this session.
   */
  public void applyAgreement(String code) {
    this.agreementCode = code;
    this.updatedAt = OffsetDateTime.now();
  }

  // Transitional and Test setters have been removed. 
  // State changes are now exclusively performed via domain methods or at construction/factory time.

  public void registerExit(
      AppUser exitOperator,
      OffsetDateTime exitAt,
      BigDecimal totalAmount,
      String exitNotes,
      String exitImageUrl
  ) {
      if (this.status != SessionStatus.ACTIVE) {
          throw new com.parkflow.modules.common.exception.domain.BusinessValidationException("Solo se pueden cerrar sesiones activas");
      }
      this.exitOperator = exitOperator;
      this.exitAt = exitAt;
      this.totalAmount = totalAmount;
      this.status = SessionStatus.CLOSED;
      this.exitNotes = exitNotes;
      this.exitImageUrl = exitImageUrl;
      this.syncStatus = SessionSyncStatus.PENDING;
      this.updatedAt = OffsetDateTime.now();
      
      this.registerEvent(new com.parkflow.modules.parking.operation.domain.event.SessionClosedEvent(this, exitOperator, totalAmount));
  }

  public void registerLostTicket(
      AppUser operator,
      OffsetDateTime exitAt,
      BigDecimal totalAmount,
      String reason,
      String exitImageUrl
  ) {
      if (this.status != SessionStatus.ACTIVE) {
          throw new com.parkflow.modules.common.exception.domain.BusinessValidationException("Solo se pueden marcar como extraviadas sesiones activas");
      }
      this.lostTicket = true;
      this.lostTicketReason = reason;
      this.exitAt = exitAt;
      this.exitOperator = operator;
      this.exitImageUrl = exitImageUrl;
      this.status = SessionStatus.LOST_TICKET;
      this.syncStatus = SessionSyncStatus.SYNCED;
      this.totalAmount = totalAmount;
      this.updatedAt = OffsetDateTime.now();
      
      this.registerEvent(new com.parkflow.modules.parking.operation.domain.event.SessionLostTicketEvent(this, operator, totalAmount, reason));
  }

  public void reprintTicket(AppUser operator, int maxReprints, String reason) {
      if (this.reprintCount >= maxReprints) {
          throw new com.parkflow.modules.common.exception.domain.BusinessValidationException("LIMITE_REIMPRESION", "Limite de reimpresion alcanzado");
      }
      this.reprintCount++;
      this.updatedAt = OffsetDateTime.now();
      
      this.registerEvent(new com.parkflow.modules.parking.operation.domain.event.TicketReprintedEvent(this, operator, this.reprintCount, reason));
  }

  public void voidSession(AppUser operator, String reason) {
      if (this.status != SessionStatus.ACTIVE) {
          throw new com.parkflow.modules.common.exception.domain.BusinessValidationException("Solo se pueden anular sesiones activas");
      }
      this.status = SessionStatus.CANCELED;
      this.exitNotes = reason;
      this.updatedAt = OffsetDateTime.now();
      
      this.registerEvent(new com.parkflow.modules.parking.operation.domain.event.SessionVoidedEvent(this, operator, reason));
  }

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
