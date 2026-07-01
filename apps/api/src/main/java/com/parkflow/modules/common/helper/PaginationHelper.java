package com.parkflow.modules.common.helper;

import com.parkflow.modules.common.dto.ApiMeta.PaginationMeta;
import org.springframework.data.domain.Page;

public final class PaginationHelper {

    private PaginationHelper() {}

    public static PaginationMeta buildPaginationMeta(Page<?> page) {
        if (page == null) return null;
        return PaginationMeta.offset(
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.hasNext(),
            page.hasPrevious()
        );
    }
}
