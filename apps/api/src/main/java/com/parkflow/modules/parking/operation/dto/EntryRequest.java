package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EntryRequest(
    @Size(max = 200) String idempotencyKey,
    @NotBlank String plate,
    @NotNull VehicleType type,
    UUID rateId,
    @NotNull UUID operatorUserId,
    OffsetDateTime entryAt,
    String site,
    String lane,
    String booth,
    String terminal,
    String observations,
    String vehicleCondition,
    List<String> conditionChecklist,
    List<String> conditionPhotoUrls) {}
