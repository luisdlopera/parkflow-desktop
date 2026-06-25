package com.parkflow.modules.billing.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "invoice_notes")
public class InvoiceNote {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Column(name = "invoice_id", nullable = false)
  private UUID invoiceId;

  @Column(name = "note_type", nullable = false, length = 10)
  private String noteType;

  @Column(name = "external_id", length = 255)
  private String externalId;

  @Column(nullable = false, length = 500)
  private String reason;

  @Column(nullable = false, precision = 18, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 30)
  private String status = "PENDING";

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "provider_raw_response", columnDefinition = "jsonb")
  private Map<String, Object> providerRawResponse;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
