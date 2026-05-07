package com.parkflow.modules.common.dto;

import java.time.Instant;
import java.util.Map;

/** Standardized API error response envelope. */
public record ErrorResponse(
    Instant timestamp,
    String correlationId,
    int status,
    String errorCode,
    String userMessage,
    String developerMessage,
    String path,
    Map<String, Object> details
) {
    public ErrorResponse(int status, String errorCode, String userMessage, String developerMessage, String path, String correlationId) {
        this(Instant.now(), correlationId, status, errorCode, userMessage, developerMessage, path, null);
    }

    public ErrorResponse(int status, String errorCode, String userMessage, String developerMessage, String path, String correlationId, Map<String, Object> details) {
        this(Instant.now(), correlationId, status, errorCode, userMessage, developerMessage, path, details);
    }
}
