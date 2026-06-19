package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record MassExitFilterRequest(
    @NotNull ChargeMode chargeMode,
    BigDecimal customAmount,
    @NotBlank @Size(max = 500) String reason,
    String vehicleTypeCode,
    String siteCode,
    OffsetDateTime entryFrom,
    OffsetDateTime entryTo,
    List<String> selectedLocators,
    @NotNull UUID operatorUserId,
    UUID cashSessionId,
    PaymentMethod paymentMethod) {

  public enum ChargeMode {
    NORMAL,
    FREE,
    CUSTOM
  }

  @AssertTrue(message = "customAmount es obligatorio cuando chargeMode es CUSTOM")
  public boolean isCustomAmountValid() {
    return chargeMode != ChargeMode.CUSTOM || customAmount != null;
  }
}
