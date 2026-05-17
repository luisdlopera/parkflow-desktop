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
@Table(name = "company_settings_snapshot")
public class CompanySettingsSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  @Column(nullable = false)
  private int version;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "settings_json", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> settingsJson;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "progress_data", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> progressData;

  @Column(nullable = false)
  private String reason;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private String createdBy;
}
