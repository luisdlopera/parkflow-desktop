package com.parkflow.modules.search.domain.model;

import lombok.Builder;
import lombok.Getter;
import java.util.Map;

@Getter
@Builder
public class SearchResult {
    private final String id;
    private final SearchType type;
    private final String title;
    private final String subtitle;
    private final String actionUrl;
    private final Double score;
    private final Map<String, Object> metadata;
}
