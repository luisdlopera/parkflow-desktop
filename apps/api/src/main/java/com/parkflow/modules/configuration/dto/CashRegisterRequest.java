package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CashRegisterRequest(
    @NotBlank @Size(max = 80) String site,
    UUID siteId,
    @NotBlank @Size(max = 20) String code,
    @Size(max = 120) String name,
    @NotBlank @Size(max = 80) String terminal,
    @Size(max = 120) String label,
    UUID printerId,
    UUID responsibleUserId,
    boolean active) {}
