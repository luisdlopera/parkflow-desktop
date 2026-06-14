package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.Size;

public record CustodiedItemRequest(
    @Size(max = 100) String identifier,
    @Size(max = 500) String observations,
    @Size(max = 500) String photoUrl
) {}
