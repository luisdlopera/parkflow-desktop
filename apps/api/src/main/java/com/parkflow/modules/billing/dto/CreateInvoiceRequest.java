package com.parkflow.modules.billing.dto;

import com.parkflow.modules.billing.domain.enums.CountryCode;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateInvoiceRequest {

  @NotNull
  private UUID clientId;

  private CountryCode countryCode = CountryCode.CO;
  private String currency = "COP";
  private LocalDate dueDate;

  @NotEmpty
  private List<InvoiceItemRequest> items;

  @Data
  public static class InvoiceItemRequest {
    @NotNull
    private String description;

    @Positive
    private BigDecimal quantity = BigDecimal.ONE;

    @NotNull
    @Positive
    private BigDecimal unitPrice;

    private BigDecimal discountPct = BigDecimal.ZERO;
    private BigDecimal taxPct = BigDecimal.ZERO;
    private String productCode;
    private String unitOfMeasure = "UND";
  }
}
