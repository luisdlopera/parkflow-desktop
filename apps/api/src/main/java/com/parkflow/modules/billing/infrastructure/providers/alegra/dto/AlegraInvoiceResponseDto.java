package com.parkflow.modules.billing.infrastructure.providers.alegra.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AlegraInvoiceResponseDto {
  private String id;
  private String number;
  private String status;

  @JsonProperty("electronicInvoiceId")
  private String electronicInvoiceId;

  @JsonProperty("cufe")
  private String cufe;

  @JsonProperty("numberTemplate")
  private NumberTemplate numberTemplate;

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class NumberTemplate {
    private String number;
    private String prefix;
    private String fullNumber;
  }
}
