package com.parkflow.modules.parking.operation.domain;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.configuration.domain.Rate;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "parking_session")
public class ParkingSession {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true)
  private String ticketNumber;

  @Column(nullable = false, length = 20)
  private String plate;

  @Column(nullable = false, length = 2)
  private String countryCode = "CO";

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private EntryMode entryMode = EntryMode.VISITOR;

  @Column(nullable = false)
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
  private OffsetDateTime entryAt = OffsetDateTime.now();

  private OffsetDateTime exitAt;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SessionStatus status = SessionStatus.ACTIVE;

  private String entryNotes;

  private String exitNotes;

  @Column(name = "entry_image_url")
  private String entryImageUrl;

  @Column(name = "exit_image_url")
  private String exitImageUrl;

  @Enumerated(EnumType.STRING)
  @Column(name = "sync_status", nullable = false, length = 20)
  private SessionSyncStatus syncStatus = SessionSyncStatus.SYNCED;

  @Column(nullable = false)
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
  private boolean isMonthlySession = false;

  @Column(nullable = false)
  private int reprintCount = 0;

  @Column(length = 50)
  private String agreementCode;

  @Column(nullable = false)
  private int appliedPrepaidMinutes = 0;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
