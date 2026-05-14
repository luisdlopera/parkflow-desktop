package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LostTicketRequest(
    @NotBlank @Size(max = 200) String idempotencyKey,
    String ticketNumber,
    String plate,
  @NotNull UUID operatorUserId,
  PaymentMethod paymentMethod,
    @NotBlank String reason,
    OffsetDateTime approximateEntryAt,
    String exitImageUrl) {

  @AssertTrue(message = "ticketNumber o plate es obligatorio")
  public boolean hasLocator() {
    return (ticketNumber != null && !ticketNumber.isBlank()) || (plate != null && !plate.isBlank());
  }
}
