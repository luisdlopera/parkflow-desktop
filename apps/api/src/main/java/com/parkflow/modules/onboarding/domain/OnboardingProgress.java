package com.parkflow.modules.onboarding.domain;

import com.parkflow.modules.licensing.domain.Company;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.Setter;

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
  @Column(name = "progress_data", columnDefinition = "jsonb")
  private Map<String, Object> progressData;

  @Column(name = "rule_version")
  private Integer ruleVersion;

  @Column(name = "snapshot_hash")
  private String snapshotHash;

  @Column(name = "materialization_failed", nullable = false)
  private boolean materializationFailed = false;

  public void setRuleVersion(Integer ruleVersion) {
    this.ruleVersion = ruleVersion;
  }

  public void setSnapshotHash(String snapshotHash) {
    this.snapshotHash = snapshotHash;
  }

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @Version
  @Column(nullable = false)
  private Long version = 0L;

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
