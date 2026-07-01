package com.parkflow.modules.common.dto;

import java.time.Instant;
import java.util.Map;

public record ApiResponse<T>(
    boolean success,
    T data,
    ApiMeta meta,
    ApiError error,
    String message
) {
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

    public static <T> ApiResponse<T> created(T data, String path, String traceId) {
        return new ApiResponse<>(
            true,
            data,
            ApiMeta.defaultMeta(path, traceId),
            null,
            "Recurso creado correctamente"
        );
    }

    public static <T> ApiResponse<T> error(String message, String code, String path, String traceId, Map<String, Object> details) {
        return new ApiResponse<>(
            false,
            null,
            ApiMeta.defaultMeta(path, traceId),
            new ApiError(code, message, details, traceId),
            message
        );
    }
}
