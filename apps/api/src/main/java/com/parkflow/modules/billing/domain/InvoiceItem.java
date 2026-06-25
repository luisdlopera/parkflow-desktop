package com.parkflow.modules.billing.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "electronic_invoice_items")
public class InvoiceItem {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "invoice_id", nullable = false)
  private Invoice invoice;

  @Column(name = "company_id", nullable = false)
  private UUID companyId;

  @Column(nullable = false, length = 500)
  private String description;

  @Column(nullable = false, precision = 10, scale = 4)
  private BigDecimal quantity = BigDecimal.ONE;

  @Column(name = "unit_price", nullable = false, precision = 18, scale = 2)
  private BigDecimal unitPrice;

  @Column(name = "discount_pct", precision = 5, scale = 2)
  private BigDecimal discountPct = BigDecimal.ZERO;

  @Column(name = "tax_pct", precision = 5, scale = 2)
  private BigDecimal taxPct = BigDecimal.ZERO;

  @Column(name = "tax_amount", precision = 18, scale = 2)
  private BigDecimal taxAmount = BigDecimal.ZERO;

  @Column(nullable = false, precision = 18, scale = 2)
  private BigDecimal total;

  @Column(name = "product_code", length = 100)
  private String productCode;

  @Column(name = "unit_of_measure", length = 30)
  private String unitOfMeasure = "UND";

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
