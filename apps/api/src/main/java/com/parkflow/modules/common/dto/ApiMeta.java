package com.parkflow.modules.common.dto;

import java.time.Instant;

/**
 * Standardized metadata structure for API responses.
 * Follows the Enterprise API pattern.
 */
public record ApiMeta(
    Instant timestamp,
    String path,
    String requestId,
    PaginationMeta pagination
) {
    public static ApiMeta defaultMeta(String path, String requestId) {
        return new ApiMeta(Instant.now(), path, requestId, null);
    }

    public record PaginationMeta(
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
    ) {}
}
