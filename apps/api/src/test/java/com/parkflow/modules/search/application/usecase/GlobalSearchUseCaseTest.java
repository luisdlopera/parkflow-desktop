package com.parkflow.modules.search.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.search.application.dto.SearchResponse;
import com.parkflow.modules.search.domain.model.SearchResult;
import com.parkflow.modules.search.domain.model.SearchType;
import com.parkflow.modules.search.domain.port.SearchProvider;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GlobalSearchUseCaseTest {

    @Mock private SearchProvider provider1;
    @Mock private SearchProvider provider2;
    @Mock private SearchProvider provider3;

    private GlobalSearchUseCase useCase;
    private final UUID companyId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        useCase = new GlobalSearchUseCase(List.of(provider1, provider2, provider3));
    }

    @Nested
    class ExecuteSearch {

        @Test
        void aggregatesResultsFromAllProviders() {
            SearchResult r1 = buildResult("TICKET", "T001", 0.95);
            SearchResult r2 = buildResult("CLIENT", "C001", 0.87);
            SearchResult r3 = buildResult("VEHICLE", "V001", 0.80);

            when(provider1.search("car", companyId)).thenReturn(List.of(r1));
            when(provider2.search("car", companyId)).thenReturn(List.of(r2));
            when(provider3.search("car", companyId)).thenReturn(List.of(r3));

            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(true);

            SearchResponse result = useCase.execute("car", companyId, null);

            assertThat(result.getQuery()).isEqualTo("car");
            assertThat(result.getResults()).hasSize(3);
            assertThat(result.getResults()).containsKeys("TICKET", "CLIENT", "VEHICLE");
            assertThat(result.getProcessingTimeMs()).isGreaterThanOrEqualTo(0);
        }

        @Test
        void groupsResultsByType() {
            SearchResult t1 = buildResult("TICKET", "T001", 0.95);
            SearchResult t2 = buildResult("TICKET", "T002", 0.85);
            SearchResult c1 = buildResult("CLIENT", "C001", 0.80);

            when(provider1.search("search", companyId)).thenReturn(List.of(t1, t2, c1));
            when(provider2.search("search", companyId)).thenReturn(List.of());
            when(provider3.search("search", companyId)).thenReturn(List.of());

            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(true);

            SearchResponse result = useCase.execute("search", companyId, null);

            assertThat(result.getResults()).hasSize(2);
            assertThat(result.getResults().get("TICKET")).hasSize(2);
            assertThat(result.getResults().get("CLIENT")).hasSize(1);
        }

        @Test
        void sortsByScoreDescending() {
            SearchResult low = buildResult("TICKET", "T001", 0.50);
            SearchResult high = buildResult("TICKET", "T002", 0.95);
            SearchResult mid = buildResult("TICKET", "T003", 0.75);

            when(provider1.search("test", companyId)).thenReturn(List.of(low, high, mid));
            when(provider2.search("test", companyId)).thenReturn(List.of());
            when(provider3.search("test", companyId)).thenReturn(List.of());

            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(true);

            SearchResponse result = useCase.execute("test", companyId, null);

            List<SearchResult> tickets = result.getResults().get("TICKET");
            assertThat(tickets.get(0).getScore()).isEqualTo(0.95);
            assertThat(tickets.get(1).getScore()).isEqualTo(0.75);
            assertThat(tickets.get(2).getScore()).isEqualTo(0.50);
        }

        @Test
        void returnsEmptyResultsWhenNoProvidersMatch() {
            when(provider1.search("x", companyId)).thenReturn(List.of());
            when(provider2.search("x", companyId)).thenReturn(List.of());
            when(provider3.search("x", companyId)).thenReturn(List.of());

            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(true);

            SearchResponse result = useCase.execute("x", companyId, null);

            assertThat(result.getResults()).isEmpty();
        }

        @Test
        void capturesProcessingTime() {
            when(provider1.search("time", companyId)).thenReturn(List.of());
            when(provider2.search("time", companyId)).thenReturn(List.of());
            when(provider3.search("time", companyId)).thenReturn(List.of());

            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(true);

            SearchResponse result = useCase.execute("time", companyId, null);

            assertThat(result.getProcessingTimeMs()).isGreaterThanOrEqualTo(0);
        }
    }

    @Nested
    class ScopeFiltering {

        @Test
        void filtersByExactScopeMatch() {
            SearchResult r1 = buildResult("TICKET", "T001", 0.95);
            SearchResult r2 = buildResult("CLIENT", "C001", 0.87);

            when(provider1.supports("tickets")).thenReturn(true);
            when(provider1.supports("clients")).thenReturn(false);
            when(provider2.supports("tickets")).thenReturn(false);
            when(provider2.supports("clients")).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(false);

            when(provider1.search("term", companyId)).thenReturn(List.of(r1));
            when(provider2.search("term", companyId)).thenReturn(List.of(r2));
            when(provider3.search("term", companyId)).thenReturn(List.of());

            SearchResponse result = useCase.execute("term", companyId, "tickets");

            verify(provider1).search("term", companyId);
            verify(provider2, never()).search(anyString(), any());
            verify(provider3, never()).search(anyString(), any());

            assertThat(result.getResults()).hasSize(1);
            assertThat(result.getResults()).containsKey("TICKET");
        }

        @Test
        void supportsAllScopeWhenScopeIsNull() {
            SearchResult r1 = buildResult("TICKET", "T001", 0.95);

            when(provider1.search("q", companyId)).thenReturn(List.of(r1));
            when(provider2.search("q", companyId)).thenReturn(List.of());
            when(provider3.search("q", companyId)).thenReturn(List.of());

            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(true);

            SearchResponse result = useCase.execute("q", companyId, null);

            verify(provider1).search("q", companyId);
            verify(provider2).search("q", companyId);
            verify(provider3).search("q", companyId);
        }

        @Test
        void supportsAllScopeWhenScopeIsAll() {
            SearchResult r1 = buildResult("TICKET", "T001", 0.95);

            when(provider1.search("q", companyId)).thenReturn(List.of(r1));
            when(provider2.search("q", companyId)).thenReturn(List.of());
            when(provider3.search("q", companyId)).thenReturn(List.of());

            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(true);
            when(provider3.supports(anyString())).thenReturn(true);

            SearchResponse result = useCase.execute("q", companyId, "all");

            verify(provider1).search("q", companyId);
            verify(provider2).search("q", companyId);
            verify(provider3).search("q", companyId);
        }

        @Test
        void filtersByScopeCaseInsensitive() {
            when(provider1.supports("TICKETS")).thenReturn(true);
            when(provider1.supports(anyString())).thenReturn(true);
            when(provider2.supports(anyString())).thenReturn(false);
            when(provider3.supports(anyString())).thenReturn(false);

            when(provider1.search("q", companyId)).thenReturn(List.of());
            when(provider2.search("q", companyId)).thenReturn(List.of());
            when(provider3.search("q", companyId)).thenReturn(List.of());

            SearchResponse result = useCase.execute("q", companyId, "tickets");

            verify(provider1).search("q", companyId);
            verify(provider2, never()).search(anyString(), any());
        }

        @Test
        void multipleProvidersCanSupportSameScope() {
            SearchResult r1 = buildResult("TICKET", "T001", 0.95);
            SearchResult r2 = buildResult("TICKET", "T002", 0.90);

            when(provider1.supports("tickets")).thenReturn(true);
            when(provider2.supports("tickets")).thenReturn(true);
            when(provider3.supports("tickets")).thenReturn(false);

            when(provider1.search("search", companyId)).thenReturn(List.of(r1));
            when(provider2.search("search", companyId)).thenReturn(List.of(r2));
            when(provider3.search("search", companyId)).thenReturn(List.of());

            SearchResponse result = useCase.execute("search", companyId, "tickets");

            assertThat(result.getResults().get("TICKET")).hasSize(2);
            verify(provider1).search("search", companyId);
            verify(provider2).search("search", companyId);
        }
    }

    @Nested
    class NoProviders {

        @Test
        void returnsEmptyResultsWithNoProviders() {
            GlobalSearchUseCase emptyUseCase = new GlobalSearchUseCase(List.of());

            SearchResponse result = emptyUseCase.execute("query", companyId, null);

            assertThat(result.getQuery()).isEqualTo("query");
            assertThat(result.getResults()).isEmpty();
            assertThat(result.getProcessingTimeMs()).isGreaterThanOrEqualTo(0);
        }
    }

    // Helper
    private SearchResult buildResult(String type, String id, Double score) {
        return SearchResult.builder()
                .id(id)
                .type(SearchType.valueOf(type))
                .title(type + " " + id)
                .subtitle("Description for " + id)
                .score(score)
                .build();
    }
}
