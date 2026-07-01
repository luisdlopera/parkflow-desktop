package com.parkflow.modules.common.dto;

import java.util.List;
import java.util.Map;

/**
 * Standardized error structure for API responses.
 * Follows the Enterprise API pattern for predictable client error handling.
 *
 * <p>The {@code issues} field is populated for validation errors (HTTP 400/422)
 * and follows the canonical ValidationIssue schema defined in the ParkFlow API contract.
 * The {@code details} field carries technical context and is suppressed in production
 * via the {@code app.debug.expose-developer-messages} property.
 */
public record ApiError(
    String code,
    String message,
    Map<String, Object> details,
    String traceId,
    List<ValidationIssue> issues
) {

    /**
     * Factory for errors without field-level validation issues (e.g. auth, business logic).
     */
    public static ApiError of(String code, String message, String traceId, Map<String, Object> details) {
        return new ApiError(code, message, details, traceId, null);
    }

    /**
     * Factory for field-level validation errors — populates {@code issues} array
     * per the canonical API contract spec.
     */
    public static ApiError ofValidation(String code, String message, String traceId, List<ValidationIssue> issues) {
        return new ApiError(code, message, null, traceId, issues);
    }
}
