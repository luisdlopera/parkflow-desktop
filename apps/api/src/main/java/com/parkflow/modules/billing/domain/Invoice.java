package com.parkflow.modules.billing.domain;

import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.domain.enums.InvoiceSourceType;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "electronic_invoices")
public class Invoice {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Column(nullable = false, length = 50)
  private String number;

  @Column(name = "external_id", length = 255)
  private String externalId;

  @Column(name = "external_number", length = 100)
  private String externalNumber;

  @Column(length = 500)
  private String cufe;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private InvoiceStatus status = InvoiceStatus.DRAFT;

  @Enumerated(EnumType.STRING)
  @Column(name = "provider_type", nullable = false, length = 50)
  private InvoiceProviderType providerType;

  @Column(name = "client_id")
  private UUID clientId;

  @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private List<InvoiceItem> items = new ArrayList<>();

  @Column(nullable = false, precision = 18, scale = 2)
  private BigDecimal subtotal;

  @Column(name = "tax_amount", nullable = false, precision = 18, scale = 2)
  private BigDecimal taxAmount = BigDecimal.ZERO;

  @Column(nullable = false, precision = 18, scale = 2)
  private BigDecimal total;

  @Column(nullable = false, length = 3)
  private String currency = "COP";

  @Enumerated(EnumType.STRING)
  @Column(name = "country_code", nullable = false, length = 5)
  private CountryCode countryCode = CountryCode.CO;

  @Enumerated(EnumType.STRING)
  @Column(name = "source_type", length = 50)
  private InvoiceSourceType sourceType;

  @Column(name = "source_id")
  private UUID sourceId;

  @Column(name = "due_date")
  private LocalDate dueDate;

  @Column(name = "issued_at")
  private OffsetDateTime issuedAt;

  @Column(name = "paid_at")
  private OffsetDateTime paidAt;

  @Column(name = "cancelled_at")
  private OffsetDateTime cancelledAt;

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
