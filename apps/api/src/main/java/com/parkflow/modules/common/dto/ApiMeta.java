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
        String type,         // "offset" | "cursor"
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrev,
        String nextCursor,   // null for offset pagination
        String prevCursor    // null for offset pagination
    ) {
        public static PaginationMeta offset(int page, int size, long totalElements, int totalPages, boolean hasNext, boolean hasPrev) {
            return new PaginationMeta("offset", page, size, totalElements, totalPages, hasNext, hasPrev, null, null);
        }

        public static PaginationMeta cursor(int size, boolean hasNext, boolean hasPrev, String nextCursor, String prevCursor) {
            return new PaginationMeta("cursor", 0, size, 0, 0, hasNext, hasPrev, nextCursor, prevCursor);
        }
    }
}
