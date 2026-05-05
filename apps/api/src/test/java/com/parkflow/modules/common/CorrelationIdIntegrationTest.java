package com.parkflow.modules.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.parkflow.config.CorrelationIdFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class CorrelationIdIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Should generate correlation ID when not provided")
    void shouldGenerateCorrelationIdWhenNotProvided() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(header().exists(CorrelationIdFilter.CORRELATION_ID_HEADER))
                .andExpect(header().string(CorrelationIdFilter.CORRELATION_ID_HEADER, org.hamcrest.Matchers.notNullValue()));
    }

    @Test
    @DisplayName("Should accept and return provided correlation ID")
    void shouldAcceptAndReturnProvidedCorrelationId() throws Exception {
        String providedCorrelationId = "test-correlation-id-123";

        mockMvc.perform(get("/actuator/health")
                        .header(CorrelationIdFilter.CORRELATION_ID_HEADER, providedCorrelationId))
                .andExpect(status().isOk())
                .andExpect(header().string(CorrelationIdFilter.CORRELATION_ID_HEADER, providedCorrelationId));
    }

    @Test
    @DisplayName("Should include correlation ID in error response")
    void shouldIncludeCorrelationIdInErrorResponse() throws Exception {
        String providedCorrelationId = "error-test-correlation-id";

        // Access a protected endpoint without auth to trigger 403 which should include correlation ID
        mockMvc.perform(get("/api/v1/auth/me")
                        .header(CorrelationIdFilter.CORRELATION_ID_HEADER, providedCorrelationId))
                .andExpect(status().isForbidden())
                .andExpect(header().string(CorrelationIdFilter.CORRELATION_ID_HEADER, providedCorrelationId));
    }

    @Test
    @DisplayName("Should return correlation ID for unauthorized requests")
    void shouldReturnCorrelationIdForUnauthorizedRequests() throws Exception {
        // Attempt to access protected endpoint without auth - tests correlation id is present in error response
        mockMvc.perform(post("/api/v1/operations/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(header().exists(CorrelationIdFilter.CORRELATION_ID_HEADER));
    }

    @Test
    @DisplayName("Generated correlation ID should be valid UUID format")
    void generatedCorrelationIdShouldBeValidUUID() throws Exception {
        MvcResult result = mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andReturn();

        String correlationId = result.getResponse().getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertThat(correlationId)
                .isNotNull()
                .matches(id -> id.matches("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"));
    }
}
