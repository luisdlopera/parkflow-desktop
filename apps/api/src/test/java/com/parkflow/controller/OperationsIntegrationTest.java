package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class OperationsIntegrationTest extends BaseIntegrationTest {

    @Test
    void registerEntry_ShouldCreateSession_WhenValidRequest() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "entry-test-001",
                "plate": "ABC123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Ingreso de prueba"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists());
    }

    @Test
    void registerEntry_ShouldReturn400_WhenInvalidPlate() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "plate": "invalid plate",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getActiveSessions_ShouldReturnList() throws Exception {
        String token = getAuthToken();

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void registerExit_ShouldProcessPayment_WhenValidSession() throws Exception {
        // First create entry
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "entry-test-002",
                "plate": "XYZ789",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Salida de prueba"
            }
            """.formatted(rateId, adminUserId);

        var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andReturn();

        String entryResponse = entryResult.getResponse().getContentAsString();
        // Parse ticketNumber
        int start = entryResponse.indexOf("\"ticketNumber\":\"") + 16;
        int end = entryResponse.indexOf("\"", start);
        String ticketNumber = entryResponse.substring(start, end);

        // Now exit
        String exitRequest = String.format("""
            {
                "idempotencyKey": "exit-test-001",
                "ticketNumber": "%s",
                "paymentMethod": "CASH",
                "operatorUserId": "%s",
                "terminal": "TERM1",
                "observations": "Salida de prueba"
            }
            """, ticketNumber, adminUserId);

        mockMvc.perform(post("/api/v1/operations/exits")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exitRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").exists());
    }

    @Test
    @RepeatedTest(5)
    void concurrentEntries_ShouldHandleConcurrency() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "entry-test-concurrent-%d",
                "plate": "CONC%d",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "terminal": "TERM1",
                "site": "Test Site",
                "observations": "Ingreso concurrente"
            }
            """;

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest.formatted(Thread.currentThread().getId(), Thread.currentThread().getId(), rateId, adminUserId)))
                .andExpect(status().isCreated());
    }
}