package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ReprintRequest(
	@Size(max = 200) String idempotencyKey,
	@NotBlank String ticketNumber,
	@NotNull UUID operatorUserId,
	@NotBlank String reason) {}
