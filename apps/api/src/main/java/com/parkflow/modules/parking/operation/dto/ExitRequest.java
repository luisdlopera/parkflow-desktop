package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ExitRequest(
    @Size(max = 200) String idempotencyKey,
    String ticketNumber,
    String plate,
    UUID operatorUserId,
    PaymentMethod paymentMethod,
    OffsetDateTime exitAt,
    String observations,
    String vehicleCondition,
    List<String> conditionChecklist,
    List<String> conditionPhotoUrls) {

  @AssertTrue(message = "ticketNumber o plate es obligatorio")
  public boolean hasLocator() {
    return (ticketNumber != null && !ticketNumber.isBlank()) || (plate != null && !plate.isBlank());
  }
}
