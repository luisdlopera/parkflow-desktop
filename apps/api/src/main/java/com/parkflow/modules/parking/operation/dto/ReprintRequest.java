package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ReprintRequest(
	@NotBlank String ticketNumber,
	@NotNull UUID operatorUserId,
	@NotBlank String reason) {}
