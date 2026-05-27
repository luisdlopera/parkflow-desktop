package com.parkflow.modules.configuration.infrastructure.search;

import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.search.domain.model.SearchResult;
import com.parkflow.modules.search.domain.model.SearchType;
import com.parkflow.modules.search.domain.port.SearchProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ParkingSiteSearchProvider implements SearchProvider {

    private final ParkingSitePort parkingSitePort;

    @Override
    public List<SearchResult> search(String query, UUID companyId) {
        return parkingSitePort.search(companyId, query, null, PageRequest.of(0, 10))
                .stream()
                .map(site -> toResult(site, query))
                .collect(Collectors.toList());
    }

    @Override
    public boolean supports(String scope) {
        return "sites".equalsIgnoreCase(scope) || "configuracion".equalsIgnoreCase(scope);
    }

    private SearchResult toResult(ParkingSite site, String query) {
        return SearchResult.builder()
                .id(site.getId().toString())
                .type(SearchType.ACTION)
                .title(site.getName())
                .subtitle(site.getCode() + (site.getCity() != null ? " · " + site.getCity() : ""))
                .actionUrl("/configuracion/sedes")
                .score(calculateScore(site, query))
                .metadata(Map.of(
                        "status", site.isActive() ? "ACTIVE" : "INACTIVE",
                        "code", site.getCode()
                ))
                .build();
    }

    private Double calculateScore(ParkingSite site, String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        if (q.isEmpty()) return 0.3;
        if (site.getCode() != null && site.getCode().equalsIgnoreCase(q)) return 1.0;
        if (site.getName() != null && site.getName().equalsIgnoreCase(q)) return 0.95;
        if (site.getCity() != null && site.getCity().toLowerCase().contains(q)) return 0.7;
        return 0.5;
    }
}
