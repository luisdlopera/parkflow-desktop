package com.parkflow.modules.common.dto;

import java.util.Map;

/**
 * Standardized error structure for API responses.
 * Follows the Enterprise API pattern for predictable client error handling.
 */
public record ApiError(
    String code,
    String message,
    Map<String, Object> details,
    String traceId
) {
}
