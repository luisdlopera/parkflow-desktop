package com.parkflow.modules.billing.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ExternalInvoiceResult {
  String externalId;
  String externalNumber;
  String cufe;
  String pdfUrl;
  String rawStatus;

  public static ExternalInvoiceResult of(String externalId, String externalNumber, String cufe) {
    return ExternalInvoiceResult.builder()
        .externalId(externalId)
        .externalNumber(externalNumber)
        .cufe(cufe)
        .build();
  }
}
