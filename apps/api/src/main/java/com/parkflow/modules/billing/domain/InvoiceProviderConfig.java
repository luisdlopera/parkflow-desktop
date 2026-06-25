package com.parkflow.modules.billing.domain;

import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "invoice_providers")
public class InvoiceProviderConfig {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Enumerated(EnumType.STRING)
  @Column(name = "provider_type", nullable = false, length = 50)
  private InvoiceProviderType providerType;

  @Column(name = "is_active", nullable = false)
  private boolean isActive = false;

  @Column(name = "is_default", nullable = false)
  private boolean isDefault = false;

  @Enumerated(EnumType.STRING)
  @Column(name = "country_code", nullable = false, length = 5)
  private CountryCode countryCode = CountryCode.CO;

  @Column(nullable = false, length = 3)
  private String currency = "COP";

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "encrypted_credentials", columnDefinition = "jsonb", nullable = false)
  private Map<String, String> encryptedCredentials;

  @Column(name = "resolution_number", length = 50)
  private String resolutionNumber;

  @Column(name = "resolution_prefix", length = 10)
  private String resolutionPrefix;

  @Column(name = "resolution_from")
  private Long resolutionFrom;

  @Column(name = "resolution_to")
  private Long resolutionTo;

  @Column(name = "resolution_valid_from")
  private LocalDate resolutionValidFrom;

  @Column(name = "resolution_valid_to")
  private LocalDate resolutionValidTo;

  @Column(name = "tax_regime", length = 30)
  private String taxRegime;

  @Column(name = "webhook_secret", length = 255)
  private String webhookSecret;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
