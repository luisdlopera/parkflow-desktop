package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SyncIntegrationTest extends BaseIntegrationTest {

    @Test
    void syncData_ShouldReturnSyncStatus() throws Exception {
        String token = getAuthToken();

        mockMvc.perform(post("/api/v1/sync/push")
                .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"idempotencyKey\":\"sync-test-001\",\"eventType\":\"TEST_EVENT\",\"aggregateId\":\"AGG-1\",\"payloadJson\":\"{}\",\"userId\":\"" + adminUserId + "\",\"deviceId\":\"test-device\",\"sessionId\":\"test-session\",\"origin\":\"ONLINE\"}"))
                .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.direction").value("PUSH"));
    }
}