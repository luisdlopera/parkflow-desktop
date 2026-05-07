package com.parkflow.integration;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.assertj.core.api.Assertions.assertThat;

class OfflineIntegrationTest extends BaseIntegrationTest {

    @Test
    void offlineEntry_ShouldQueueLocally() throws Exception {
        String entryRequest = """
            {
                "plate": "ABC123",
                "type": "CAR",
                "rateId": "00000000-0000-0000-0000-000000000001",
                "operatorUserId": "00000000-0000-0000-0000-000000000001",
                "offline": true
            }
            """;

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUEUED_OFFLINE"));
    }

    @Test
    void syncAfterOffline_ShouldReconcileData() throws Exception {
        // First, create some offline entries
        String syncRequest = """
            {
                "lastSyncTimestamp": "2024-01-01T00:00:00Z",
                "pendingOperations": [
                    {
                        "type": "ENTRY",
                        "data": {"plate": "SYNC123", "type": "CAR"}
                    }
                ]
            }
            """;

        mockMvc.perform(post("/api/v1/sync/bulk")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(syncRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reconciled").value(true));
    }

    @Test
    void offlinePayment_ShouldSyncOnReconnect() throws Exception {
        String paymentRequest = """
            {
                "amount": 500,
                "method": "CASH",
                "offline": true,
                "sessionId": "00000000-0000-0000-0000-000000000001"
            }
            """;

        mockMvc.perform(post("/api/v1/cash/payments")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(paymentRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.synced").value(false));

        // Simulate reconnect and sync
        mockMvc.perform(post("/api/v1/sync/reconnect")
                .header("Authorization", "Bearer " + getAuthToken()))
                .andExpect(status().isOk());
    }

    @Test
    void conflictResolution_ShouldHandleDuplicates() throws Exception {
        // Simulate duplicate entry from offline sync
        String conflictRequest = """
            {
                "operationId": "DUPLICATE_001",
                "resolution": "MERGE"
            }
            """;

        mockMvc.perform(post("/api/v1/sync/conflicts/resolve")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(conflictRequest))
                .andExpect(status().isOk());
    }
}