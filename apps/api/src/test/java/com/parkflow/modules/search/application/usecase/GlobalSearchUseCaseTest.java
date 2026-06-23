package com.parkflow.modules.search.application.usecase;

import com.parkflow.modules.search.application.dto.SearchResponse;
import com.parkflow.modules.search.domain.model.SearchResult;
import com.parkflow.modules.search.domain.model.SearchType;
import com.parkflow.modules.search.domain.port.SearchProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalSearchUseCaseTest {

    private static final UUID COMPANY_ID = UUID.randomUUID();
    private static final String QUERY = "ABC123";

    @Mock
    private SearchProvider ticketProvider;

    @Mock
    private SearchProvider customerProvider;

    private GlobalSearchUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new GlobalSearchUseCase(List.of(ticketProvider, customerProvider));
    }

    @Test
    void shouldSearchAcrossAllProvidersWhenScopeIsNull() {
        when(ticketProvider.search(eq(QUERY), eq(COMPANY_ID)))
            .thenReturn(List.of(searchResult("ticket-1", SearchType.TICKET, 1.0)));
        when(customerProvider.search(eq(QUERY), eq(COMPANY_ID)))
            .thenReturn(List.of(searchResult("cust-1", SearchType.CLIENT, 0.8)));

        SearchResponse response = useCase.execute(QUERY, COMPANY_ID, null);

        assertThat(response.getQuery()).isEqualTo(QUERY);
        assertThat(response.getResults()).hasSize(2);
        assertThat(response.getProcessingTimeMs()).isGreaterThanOrEqualTo(0);
    }

    @Test
    void shouldFilterByScope() {
        when(ticketProvider.supports(eq("tickets"))).thenReturn(true);
        when(ticketProvider.search(eq(QUERY), eq(COMPANY_ID)))
            .thenReturn(List.of(searchResult("ticket-1", SearchType.TICKET, 1.0)));

        SearchResponse response = useCase.execute(QUERY, COMPANY_ID, "tickets");

        assertThat(response.getResults()).containsKey("TICKET");
        assertThat(response.getResults()).doesNotContainKey("CLIENT");
    }

    @Test
    void shouldReturnResultsSortedByScore() {
        when(ticketProvider.search(eq(QUERY), eq(COMPANY_ID)))
            .thenReturn(List.of(
                searchResult("low", SearchType.TICKET, 0.3),
                searchResult("high", SearchType.TICKET, 0.9)
            ));

        SearchResponse response = useCase.execute(QUERY, COMPANY_ID, null);

        List<SearchResult> tickets = response.getResults().get("TICKET");
        assertThat(tickets).hasSize(2);
        assertThat(tickets.get(0).getScore()).isGreaterThan(tickets.get(1).getScore());
    }

    @Test
    void shouldReturnEmptyResultsWhenNoProvidersMatch() {
        SearchResponse response = useCase.execute(QUERY, COMPANY_ID, "nonexistent");

        assertThat(response.getResults()).isEmpty();
    }

    @Test
    void shouldHandleEmptyProviderList() {
        GlobalSearchUseCase emptyUseCase = new GlobalSearchUseCase(List.of());

        SearchResponse response = emptyUseCase.execute(QUERY, COMPANY_ID, null);

        assertThat(response.getResults()).isEmpty();
        assertThat(response.getQuery()).isEqualTo(QUERY);
    }

    @Test
    void shouldGroupResultsBySearchType() {
        when(ticketProvider.search(eq(QUERY), eq(COMPANY_ID)))
            .thenReturn(List.of(
                searchResult("t1", SearchType.TICKET, 1.0),
                searchResult("t2", SearchType.TICKET, 0.9)
            ));
        when(customerProvider.search(eq(QUERY), eq(COMPANY_ID)))
            .thenReturn(List.of(searchResult("c1", SearchType.CLIENT, 0.8)));

        SearchResponse response = useCase.execute(QUERY, COMPANY_ID, null);

        assertThat(response.getResults().get("TICKET")).hasSize(2);
        assertThat(response.getResults().get("CLIENT")).hasSize(1);
    }

    @Test
    void shouldHandleNullQueryGracefully() {
        when(ticketProvider.search(eq(null), eq(COMPANY_ID)))
            .thenReturn(List.of());
        when(customerProvider.search(eq(null), eq(COMPANY_ID)))
            .thenReturn(List.of());

        SearchResponse response = useCase.execute(null, COMPANY_ID, null);

        assertThat(response.getResults()).isEmpty();
        assertThat(response.getQuery()).isNull();
    }

    private static SearchResult searchResult(String id, SearchType type, double score) {
        return SearchResult.builder()
            .id(id)
            .type(type)
            .title(id)
            .score(score)
            .build();
    }
}
