package com.parkflow.modules.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CancelInvoiceRequest {
  @NotBlank
  private String reason;
}
