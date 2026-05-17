package com.parkflow.modules.search.domain.port;

import com.parkflow.modules.search.domain.model.SearchResult;
import java.util.List;
import java.util.UUID;

public interface SearchProvider {
    /**
     * Executes search for a specific term within a tenant context.
     */
    List<SearchResult> search(String query, UUID companyId);

    /**
     * Returns true if this provider should handle the specific SearchType or scope.
     */
    boolean supports(String scope);
}
