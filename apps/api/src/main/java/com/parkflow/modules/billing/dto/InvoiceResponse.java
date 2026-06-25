package com.parkflow.modules.billing.dto;

import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.domain.enums.InvoiceSourceType;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Value
@Builder
public class InvoiceResponse {
  UUID id;
  UUID companyId;
  String number;
  String externalId;
  String externalNumber;
  String cufe;
  InvoiceStatus status;
  InvoiceProviderType providerType;
  UUID clientId;
  BigDecimal subtotal;
  BigDecimal taxAmount;
  BigDecimal total;
  String currency;
  CountryCode countryCode;
  InvoiceSourceType sourceType;
  UUID sourceId;
  LocalDate dueDate;
  OffsetDateTime issuedAt;
  OffsetDateTime paidAt;
  OffsetDateTime cancelledAt;
  OffsetDateTime createdAt;
  OffsetDateTime updatedAt;
}
