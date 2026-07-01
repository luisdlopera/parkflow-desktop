package com.parkflow.modules.common.dto;

import java.util.List;
import java.util.Map;

/**
 * Canonical API response envelope for all ParkFlow REST endpoints.
 *
 * <p>Every response — success or failure — uses this wrapper to guarantee
 * predictable structure for frontend consumers (Next.js, Tauri desktop sync).
 *
 * <p>Contract rules:
 * <ul>
 *   <li>Success: {@code success=true}, {@code data} is populated, {@code error=null}.
 *   <li>Error: {@code success=false}, {@code data=null}, {@code error} is populated.
 *   <li>Mutations with no return body: {@code data=null}, {@code success=true}.
 * </ul>
 */
public record ApiResponse<T>(
    boolean success,
    T data,
    ApiMeta meta,
    ApiError error,
    String message
) {

    // ─────────────────────────────────────────────────────────────────────────
    // Success factories
    // ─────────────────────────────────────────────────────────────────────────

    public static <T> ApiResponse<T> success(T data, String path, String traceId) {
        return new ApiResponse<>(
            true,
            data,
            ApiMeta.defaultMeta(path, traceId),
            null,
            "Operacion realizada correctamente"
        );
    }

    public static <T> ApiResponse<T> success(T data, String message, String path, String traceId) {
        return new ApiResponse<>(
            true,
            data,
            ApiMeta.defaultMeta(path, traceId),
            null,
            message
        );
    }

    /** Used for void/no-content mutations (DELETE, void methods). */
    public static ApiResponse<Void> empty(String path, String traceId) {
        return new ApiResponse<>(
            true,
            null,
            ApiMeta.defaultMeta(path, traceId),
            null,
            "Operacion realizada correctamente"
        );
    }

    public static <T> ApiResponse<T> created(T data, String path, String traceId) {
        return new ApiResponse<>(
            true,
            data,
            ApiMeta.defaultMeta(path, traceId),
            null,
            "Recurso creado correctamente"
        );
    }

    public static <T> ApiResponse<T> paginated(
        T data,
        long totalElements,
        int totalPages,
        int page,
        int size,
        String path,
        String traceId
    ) {
        boolean hasNext = page < totalPages - 1;
        boolean hasPrev = page > 0;
        ApiMeta.PaginationMeta pagMeta = ApiMeta.PaginationMeta.offset(
            page,
            size,
            totalElements,
            totalPages,
            hasNext,
            hasPrev
        );
        ApiMeta apiMeta = new ApiMeta(java.time.Instant.now(), path, traceId, pagMeta);
        return new ApiResponse<>(
            true,
            data,
            apiMeta,
            null,
            "Operacion realizada correctamente"
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Error factories
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * General error factory — used for business/domain errors without field-level issues.
     * The {@code details} map is suppressed in production via the
     * {@code app.debug.expose-developer-messages} flag in GlobalExceptionHandler.
     */
    public static <T> ApiResponse<T> error(
            String message, String code, String path, String traceId, Map<String, Object> details) {
        return new ApiResponse<>(
            false,
            null,
            ApiMeta.defaultMeta(path, traceId),
            ApiError.of(code, message, traceId, details),
            message
        );
    }

    /**
     * Validation error factory — populates the canonical {@code issues} array
     * per the API contract spec. Used exclusively for HTTP 400/422 validation failures.
     */
    public static <T> ApiResponse<T> validationError(
            String message, String path, String traceId, List<ValidationIssue> issues) {
        return new ApiResponse<>(
            false,
            null,
            ApiMeta.defaultMeta(path, traceId),
            ApiError.ofValidation("VALIDATION_ERROR", message, traceId, issues),
            message
        );
    }
}
