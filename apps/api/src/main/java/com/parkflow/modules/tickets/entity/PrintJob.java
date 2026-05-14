package com.parkflow.modules.tickets.entity;

import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "print_jobs")
public class PrintJob {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @ManyToOne(optional = false)
  @JoinColumn(name = "session_id")
  private ParkingSession session;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PrintDocumentType documentType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PrintJobStatus status = PrintJobStatus.CREATED;

  @Column(nullable = false, unique = true)
  private String idempotencyKey;

  @Column(nullable = false)
  private String payloadHash;

  @Column(columnDefinition = "TEXT")
  private String ticketSnapshotJson;

  @Column(length = 80)
  private String terminalId;

  @Column(nullable = false)
  private int attempts = 0;

  @Column(columnDefinition = "TEXT")
  private String lastError;

  @ManyToOne
  @JoinColumn(name = "created_by_user_id")
  private AppUser createdByUser;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();
}
