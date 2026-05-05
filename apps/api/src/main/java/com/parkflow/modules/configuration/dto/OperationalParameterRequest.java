package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OperationalParameterRequest(
    @NotBlank @Size(max = 50) String timezone,
    boolean allowEntryWithoutPrinter,
    boolean allowExitWithoutPayment,
    boolean allowReprint,
    boolean allowVoid,
    boolean requirePhotoEntry,
    boolean requirePhotoExit,
    @Min(0) int toleranceMinutes,
    @Min(0) int maxTimeNoCharge,
    @Size(max = 1000) String legalMessage,
    boolean offlineModeEnabled) {}
