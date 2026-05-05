package com.parkflow.modules.configuration.dto;

import com.parkflow.modules.configuration.entity.Printer.PrinterConnection;
import com.parkflow.modules.configuration.entity.Printer.PrinterType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PrinterRequest(
    @NotBlank @Size(max = 120) String name,
    @NotNull PrinterType type,
    @NotNull PrinterConnection connection,
    int paperWidthMm,
    @Size(max = 255) String endpointOrDevice,
    boolean isActive,
    boolean isDefault) {}
