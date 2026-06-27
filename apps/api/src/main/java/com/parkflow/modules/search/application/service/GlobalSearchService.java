package com.parkflow.modules.search.application.service;

import com.parkflow.modules.search.application.dto.SearchResponse;
import com.parkflow.modules.search.application.port.in.GlobalSearchUseCase;
import com.parkflow.modules.search.application.port.out.SearchProviderPort;
import com.parkflow.modules.search.domain.model.SearchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GlobalSearchService implements GlobalSearchUseCase {

    private final List<SearchProviderPort> searchProviders;

    @Override
    public SearchResponse execute(String query, UUID companyId, String scope) {
        long startTime = System.currentTimeMillis();

        List<SearchResult> allResults = searchProviders.stream()
                .filter(provider -> scope == null || scope.equalsIgnoreCase("all") || provider.supports(scope))
                .flatMap(provider -> provider.search(query, companyId).stream())
                .sorted((a, b) -> b.getScore().compareTo(a.getScore()))
                .collect(Collectors.toList());

        Map<String, List<SearchResult>> groupedResults = allResults.stream()
                .collect(Collectors.groupingBy(result -> result.getType().name()));

        long endTime = System.currentTimeMillis();

        return SearchResponse.builder()
                .query(query)
                .results(groupedResults)
                .processingTimeMs(endTime - startTime)
                .build();
    }
}