package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ReprintRequest(
	@NotBlank @Size(max = 200) String idempotencyKey,
	@NotBlank @Size(max = 50) String ticketNumber,
	@NotNull UUID operatorUserId,
	@NotBlank @Size(min = 3, max = 500) String reason) {}
