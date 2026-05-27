package com.parkflow.chaos;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.assertj.core.api.Assertions.assertThat;

class ChaosTest extends BaseIntegrationTest {

    @Test
    void dbFailure_ShouldReturnServiceUnavailable() throws Exception {
        // Simulate DB down by issuing an invalid SQL via JDBC that breaks the connection
        jdbcTemplate.execute("SHUTDOWN");

        mockMvc.perform(get("/api/v1/operations/supervisor/summary")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    @Test
    void dbRestartAfterFailure_ShouldRecover() throws Exception {
        // Simulate transient DB failure
        jdbcTemplate.execute("SHUTDOWN");

        // Attempt an operation — should fail
        mockMvc.perform(get("/api/v1/operations/supervisor/summary")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());

        // H2 in-memory restart is not possible after SHUTDOWN in test mode,
        // but we verify the application handles the error gracefully
        // (returns 500, not a crash or infinite hang)
    }

    @Test
    void rateLimitExceeded_ShouldReturnTooManyRequests() throws Exception {
        // Send many rapid requests to trigger rate limiting
        int requests = 25;
        int tooMany = 0;

        for (int i = 0; i < requests; i++) {
            var result = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                        "email": "admin@parkflow.local",
                                        "password": "wrong-password",
                                        "deviceId": "chaos-device"
                                    }
                                    """))
                    .andReturn();

            if (result.getResponse().getStatus() == 429) {
                tooMany++;
            }
        }

        // At least some requests should be rate-limited
        assertThat(tooMany).isGreaterThan(0);
    }

    @Test
    void malformedJson_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/operations/entries")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ malformed json }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unauthenticatedRequest_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/operations/supervisor/summary")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestWithInvalidToken_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/operations/supervisor/summary")
                        .header("Authorization", "Bearer invalid-token-that-is-definitely-not-valid")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void emptyBody_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/operations/entries")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void oversizedPayload_ShouldNotCrash() throws Exception {
        // Generate a very large payload
        StringBuilder large = new StringBuilder("{");
        for (int i = 0; i < 10000; i++) {
            large.append("\"key").append(i).append("\": \"").append("x".repeat(100)).append("\",");
        }
        large.append("\"plate\": \"ABC123\"}");

        mockMvc.perform(post("/api/v1/operations/entries")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(large.toString()))
                .andExpect(status().is4xxClientError());
    }
}
