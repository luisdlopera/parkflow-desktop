package com.parkflow.modules.configuration.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AgreementResponse(
    UUID id,
    String code,
    String companyName,
    BigDecimal discountPercent,
    int maxHoursPerDay,
    BigDecimal flatAmount,
    UUID rateId,
    String rateName,
    String site,
    UUID siteId,
    LocalDate validFrom,
    LocalDate validTo,
    boolean active,
    String notes,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
