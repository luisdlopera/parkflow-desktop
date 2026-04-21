package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record LostTicketRequest(
    String ticketNumber,
    String plate,
  @NotNull UUID operatorUserId,
  PaymentMethod paymentMethod,
    @NotBlank String reason) {

  @AssertTrue(message = "ticketNumber o plate es obligatorio")
  public boolean hasLocator() {
    return (ticketNumber != null && !ticketNumber.isBlank()) || (plate != null && !plate.isBlank());
  }
}
