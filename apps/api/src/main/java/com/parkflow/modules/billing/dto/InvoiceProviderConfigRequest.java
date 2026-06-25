package com.parkflow.modules.billing.dto;

import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.Map;

@Data
public class InvoiceProviderConfigRequest {

  @NotNull
  private InvoiceProviderType providerType;

  private boolean isDefault = false;

  @NotNull
  private CountryCode countryCode = CountryCode.CO;

  @Size(min = 3, max = 3)
  private String currency = "COP";

  @NotNull
  private Map<String, String> credentials;

  private String resolutionNumber;
  private String resolutionPrefix;
  private Long resolutionFrom;
  private Long resolutionTo;
  private LocalDate resolutionValidFrom;
  private LocalDate resolutionValidTo;
  private String taxRegime;
}
