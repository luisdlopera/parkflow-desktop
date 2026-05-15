package com.parkflow.modules.onboarding.domain;

import com.parkflow.modules.licensing.domain.Company;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "onboarding_progress")
public class OnboardingProgress {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "company_id", nullable = false, unique = true)
  private Company company;

  @Column(nullable = false)
  private int currentStep = 1;

  @Column(nullable = false)
  private boolean completed = false;

  @Column(nullable = false)
  private boolean skipped = false;

  private OffsetDateTime completedAt;

  private OffsetDateTime skippedAt;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "progress_data", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> progressData;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
