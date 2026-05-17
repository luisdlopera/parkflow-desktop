package com.parkflow.modules.search.application.dto;

import com.parkflow.modules.search.domain.model.SearchResult;
import lombok.Builder;
import lombok.Getter;
import java.util.List;
import java.util.Map;

@Getter
@Builder
public class SearchResponse {
    private final String query;
    private final Map<String, List<SearchResult>> results; // Grouped by category/type
    private final long processingTimeMs;
}
