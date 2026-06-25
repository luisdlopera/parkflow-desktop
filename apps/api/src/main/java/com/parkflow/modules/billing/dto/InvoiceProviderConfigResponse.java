package com.parkflow.modules.billing.dto;

import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Value
@Builder
public class InvoiceProviderConfigResponse {
  UUID id;
  InvoiceProviderType providerType;
  boolean isActive;
  boolean isDefault;
  CountryCode countryCode;
  String currency;
  String resolutionNumber;
  String resolutionPrefix;
  Long resolutionFrom;
  Long resolutionTo;
  LocalDate resolutionValidFrom;
  LocalDate resolutionValidTo;
  String taxRegime;
  boolean hasCredentials;
  OffsetDateTime createdAt;
  OffsetDateTime updatedAt;
}
