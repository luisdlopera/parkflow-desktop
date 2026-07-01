package com.parkflow.dto;

import lombok.Builder;

@Builder
public record RootResponse(
    String message,
    String status,
    String apiVersion,
    String health,
    String metrics
) {
}
