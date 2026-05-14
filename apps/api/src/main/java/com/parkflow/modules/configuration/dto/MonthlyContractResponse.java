package com.parkflow.modules.configuration.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MonthlyContractResponse(
    UUID id,
    UUID rateId,
    String rateName,
    String plate,
    String vehicleType,
    String holderName,
    String holderDocument,
    String holderPhone,
    String holderEmail,
    String site,
    UUID siteId,
    LocalDate startDate,
    LocalDate endDate,
    BigDecimal amount,
    boolean active,
    String notes,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
