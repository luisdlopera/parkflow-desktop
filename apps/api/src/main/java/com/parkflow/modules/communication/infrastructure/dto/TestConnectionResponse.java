package com.parkflow.modules.communication.infrastructure.dto;

import lombok.Builder;

@Builder
public record TestConnectionResponse(
    boolean success,
    String message,
    String channelType
) {
}
