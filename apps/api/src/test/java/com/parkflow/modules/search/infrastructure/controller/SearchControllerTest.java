package com.parkflow.modules.search.infrastructure.controller;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.search.domain.model.SearchResult;
import com.parkflow.modules.search.domain.model.SearchType;
import com.parkflow.modules.search.domain.port.SearchProvider;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SearchControllerTest extends BaseIntegrationTest {

    @MockBean(name = "parkingSearchProvider")
    private SearchProvider searchProvider;

    @Test
    @WithMockUser
    void shouldSearchAndReturnResults() throws Exception {
        SearchResult result = SearchResult.builder()
            .id("ticket-1")
            .type(SearchType.TICKET)
            .title("TKT-001")
            .subtitle("ABC123")
            .score(1.0)
            .build();

        when(searchProvider.supports(any())).thenReturn(true);
        when(searchProvider.search(anyString(), any(UUID.class)))
            .thenReturn(List.of(result));

        mockMvc.perform(get("/api/v1/search")
                .param("q", "ABC123")
                .header("Authorization", "Bearer " + getAuthToken())
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.query").value("ABC123"))
            .andExpect(jsonPath("$.results").isMap());
    }

    @Test
    @WithMockUser
    void shouldReturn200WithEmptyResultsWhenNoMatch() throws Exception {
        when(searchProvider.supports(any())).thenReturn(true);
        when(searchProvider.search(anyString(), any(UUID.class)))
            .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/search")
                .param("q", "ZZZZZZ")
                .header("Authorization", "Bearer " + getAuthToken())
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.results").isEmpty());
    }

    @Test
    void shouldReturn401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/search")
                .param("q", "test")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized());
    }
}
