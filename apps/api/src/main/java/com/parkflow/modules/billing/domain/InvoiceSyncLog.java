package com.parkflow.modules.billing.domain;

import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "electronic_invoice_logs")
public class InvoiceSyncLog {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Column(name = "invoice_id")
  private UUID invoiceId;

  @Enumerated(EnumType.STRING)
  @Column(name = "provider_type", nullable = false, length = 50)
  private InvoiceProviderType providerType;

  @Column(name = "event_type", nullable = false, length = 50)
  private String eventType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "request_payload", columnDefinition = "jsonb")
  private Map<String, Object> requestPayload;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "response_payload", columnDefinition = "jsonb")
  private Map<String, Object> responsePayload;

  @Column(name = "http_status")
  private Integer httpStatus;

  @Column(name = "error_message", columnDefinition = "TEXT")
  private String errorMessage;

  @Column(name = "duration_ms")
  private Integer durationMs;

  @Column(name = "correlation_id", length = 100)
  private String correlationId;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
