package com.parkflow.modules.parking.operation.domain;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.helmet.domain.HelmetToken;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder(toBuilder = true)
@Entity
@Table(name = "custodied_item")
public class CustodiedItem {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "session_id")
  private ParkingSession session;

  @Enumerated(EnumType.STRING)
  @Column(name = "item_type", nullable = false, length = 50)
  private CustodiedItemType itemType;

  @Column(length = 100)
  private String identifier;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private CustodiedItemStatus status = CustodiedItemStatus.RECEIVED;

  @Column(columnDefinition = "TEXT")
  private String observations;

  @Column(name = "photo_url", length = 500)
  private String photoUrl;

  @ManyToOne
  @JoinColumn(name = "token_id")
  private HelmetToken token;

  @ManyToOne
  @JoinColumn(name = "received_by_id")
  private AppUser receivedBy;

  @Column(nullable = false)
  @Builder.Default
  private OffsetDateTime receivedAt = OffsetDateTime.now();

  @ManyToOne
  @JoinColumn(name = "returned_by_id")
  private AppUser returnedBy;

  private OffsetDateTime returnedAt;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

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
