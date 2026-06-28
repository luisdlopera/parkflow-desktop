package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LostTicketRequest(
    @NotBlank @Size(max = 200) String idempotencyKey,
    @Size(max = 50) @Pattern(regexp = "^[A-Z0-9-]*$", message = "Ticket number must be alphanumeric") String ticketNumber,
    @Size(min = 3, max = 20) @Pattern(regexp = "^[A-Z0-9-]*$", message = "Plate must be alphanumeric") String plate,
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
