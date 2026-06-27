package com.parkflow.modules.search.application.port.in;

import com.parkflow.modules.search.application.dto.SearchResponse;

import java.util.UUID;

/**
 * Input port for global search operations.
 * Defines the use case contract for searching across all domains.
 */
public interface GlobalSearchUseCase {

    /**
     * Executes a global search across all enabled providers.
     *
     * @param query    the search query string
     * @param companyId the tenant company ID
     * @param scope    optional scope filter (e.g., "tickets", "customers") or null for all
     * @return SearchResponse with grouped results and processing time
     */
    SearchResponse execute(String query, UUID companyId, String scope);
}