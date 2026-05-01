package com.parkflow.modules.common.dto;

import java.time.Instant;
import java.util.Map;

/**
 * Standardized API error response.
 * This record provides a consistent structure for all API error responses,
 * making debugging easier with correlation IDs and timestamps.
 */
public record ErrorResponse(
    Instant timestamp,
    int status,
    String code,
    String message,
    String path,
    String correlationId,
    Map<String, Object> details
) {
    public ErrorResponse(int status, String code, String message, String path, String correlationId) {
        this(Instant.now(), status, code, message, path, correlationId, null);
    }

    public ErrorResponse(int status, String code, String message, String path, String correlationId, Map<String, Object> details) {
        this(Instant.now(), status, code, message, path, correlationId, details);
    }
}
