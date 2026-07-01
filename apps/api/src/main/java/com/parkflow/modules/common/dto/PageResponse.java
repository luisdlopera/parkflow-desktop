package com.parkflow.modules.common.dto;

import java.util.List;

public record PageResponse<T>(
    List<T> content,
    long totalElements,
    int totalPages,
    int page,
    int size
) {
    public static <T> PageResponse<T> of(List<T> content, long totalElements, int totalPages, int page, int size) {
        return new PageResponse<>(content, totalElements, totalPages, page, size);
    }

    public static <T> PageResponse<T> of(org.springframework.data.domain.Page<T> springPage) {
        return new PageResponse<>(
            springPage.getContent(),
            springPage.getTotalElements(),
            springPage.getTotalPages(),
            springPage.getNumber(),
            springPage.getSize()
        );
    }
}
