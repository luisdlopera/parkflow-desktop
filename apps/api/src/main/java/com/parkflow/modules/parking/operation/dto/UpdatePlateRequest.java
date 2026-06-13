package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePlateRequest(
    @NotBlank(message = "La nueva placa es obligatoria")
    @Size(min = 1, max = 15, message = "Longitud de placa invalida")
    String newPlate,
    
    @NotBlank(message = "La justificacion es obligatoria")
    String justification
) {}
