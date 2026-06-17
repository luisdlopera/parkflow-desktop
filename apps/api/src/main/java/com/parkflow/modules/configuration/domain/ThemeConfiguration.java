package com.parkflow.modules.configuration.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "theme_configuration")
public class ThemeConfiguration {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false, unique = true)
  private UUID companyId;

  @Column(name = "primary_color", nullable = false)
  private String primaryColor = "#f97316";

  @Column(name = "secondary_color", nullable = false)
  private String secondaryColor = "#64748b";

  @Column(name = "success_color", nullable = false)
  private String successColor = "#22c55e";

  @Column(name = "warning_color", nullable = false)
  private String warningColor = "#f59e0b";

  @Column(name = "danger_color", nullable = false)
  private String dangerColor = "#ef4444";

  @Column(name = "theme_mode", nullable = false)
  private String themeMode = "auto";

  @Column(name = "logo_url", columnDefinition = "TEXT")
  private String logoUrl;

  @Column(name = "favicon_url", columnDefinition = "TEXT")
  private String faviconUrl;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
