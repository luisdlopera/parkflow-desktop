package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EntryRequest(
    @Size(max = 200) String idempotencyKey,
    @NotBlank @Size(min = 3, max = 20) @Pattern(regexp = "^[A-Z0-9-]+$", message = "Plate must be alphanumeric") String plate,
    @NotNull String type,
    UUID rateId,
    UUID operatorUserId,
    OffsetDateTime entryAt,
    @Size(max = 100) String site,
    @Size(max = 50) String lane,
    @Size(max = 50) String booth,
    @Size(max = 50) String terminal,
    @Size(max = 500) String observations,
    @Size(max = 500) String entryImageUrl,
    @Size(max = 200) String vehicleCondition,
    List<@Size(max = 100) String> conditionChecklist,
    List<@Size(max = 500) String> conditionPhotoUrls) {}

