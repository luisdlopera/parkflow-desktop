package com.parkflow.modules.common.dto;

/**
 * Represents a single field-level validation error in the API response.
 * <p>
 * This is the standard format for validation errors in ParkFlow API.
 * Follows the Stripe/GitHub pattern for predictable client-side error handling.
 *
 * <pre>
 * {
 *   "issues": [
 *     { "field": "email", "code": "NOT_BLANK", "message": "El correo es obligatorio", "rejectedValue": "" }
 *   ]
 * }
 * </pre>
 *
 * Design notes:
 * - {@code field}: dot-notation path (e.g. "address.street")
 * - {@code code}: stable machine-readable code (e.g. "NOT_BLANK", "MAX_LENGTH")
 * - {@code message}: human-readable message (user-facing, Spanish)
 * - {@code rejectedValue}: the value that was rejected (null if sensitive)
 */
public record ValidationIssue(
    String field,
    String code,
    String message,
    Object rejectedValue
) {
    /**
     * Creates a ValidationIssue without an explicit rejected value.
     */
    public static ValidationIssue of(String field, String code, String message) {
        return new ValidationIssue(field, code, message, null);
    }
}
