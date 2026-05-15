package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EntryRequest(
    @NotBlank @Size(max = 200) String idempotencyKey,
    @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9\\-\\s]*$", message = "Plate must be alphanumeric") String plate,
    @NotNull String type,
    @Size(min = 2, max = 2) @Pattern(regexp = "^[A-Za-z]{2}$", message = "Country code must be ISO alpha-2") String countryCode,
    EntryMode entryMode,
    Boolean noPlate,
    @Size(max = 200) String noPlateReason,
    UUID rateId,
    UUID operatorUserId,
    OffsetDateTime entryAt,
    @Size(max = 100) String site,
    @Size(max = 50) String lane,
    @Size(max = 50) String booth,
    @Size(max = 50) String terminal,
    @Size(max = 500) String observations,
    @Size(max = 500) String entryImageUrl,
    @NotBlank @Size(max = 200) String vehicleCondition,
    List<@Size(max = 100) String> conditionChecklist,
    List<@Size(max = 500) String> conditionPhotoUrls) {}
