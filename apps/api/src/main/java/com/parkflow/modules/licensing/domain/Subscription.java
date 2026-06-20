package com.parkflow.modules.licensing.domain;

import com.parkflow.modules.licensing.enums.SubscriptionStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "subscriptions")
public class Subscription {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "plan_id", nullable = false)
  private Plan plan;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

  @Column(name = "starts_at", nullable = false)
  private OffsetDateTime startsAt = OffsetDateTime.now();

  @Column(name = "ends_at")
  private OffsetDateTime endsAt;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  @PrePersist
  public void prePersist() {
    this.createdAt = OffsetDateTime.now();
    this.updatedAt = OffsetDateTime.now();
  }

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }

  public boolean isActive() {
    if (status != SubscriptionStatus.ACTIVE) return false;
    if (endsAt == null) return true;
    return OffsetDateTime.now().isBefore(endsAt);
  }
}
