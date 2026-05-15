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
@Table(name = "company_settings")
public class CompanySettings {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "company_id", nullable = false, unique = true)
  private Company company;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "settings_json", nullable = false, columnDefinition = "jsonb")
  private Map<String, Object> settingsJson;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
