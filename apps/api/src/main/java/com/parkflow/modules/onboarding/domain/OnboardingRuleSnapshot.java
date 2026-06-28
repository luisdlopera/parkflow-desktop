package com.parkflow.modules.onboarding.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "onboarding_rule_snapshots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnboardingRuleSnapshot {

  @Id
  private UUID id;

  @Column(name = "version", nullable = false)
  private int version;

  @Column(name = "applied_at", nullable = false)
  private OffsetDateTime appliedAt;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "validation_rules", columnDefinition = "jsonb", nullable = false)
  private Map<String, Object> validationRules;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "default_values", columnDefinition = "jsonb", nullable = false)
  private Map<String, Object> defaultValues;

  public OnboardingRuleSnapshot(int version, Map<String, Object> validationRules, Map<String, Object> defaultValues) {
    this.id = UUID.randomUUID();
    this.version = version;
    this.appliedAt = OffsetDateTime.now();
    this.validationRules = validationRules;
    this.defaultValues = defaultValues;
  }
}
