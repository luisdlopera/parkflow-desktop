package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PrintJobIntegrationTest extends BaseIntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void createPrintJob_ShouldReturnJobWithSentStatus() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "print-entry-001",
                "plate": "ABC123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Ingreso para impresion"
            }
            """.formatted(rateId, adminUserId);

        var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andReturn();

        String entryResponse = entryResult.getResponse().getContentAsString();
            JsonNode entryJson = objectMapper.readTree(entryResponse);
            String sessionId = entryJson.path("sessionId").asText();

        String jobRequest = """
            {
                "sessionId": "%s",
                "operatorUserId": "%s",
                "documentType": "REPRINT",
                "idempotencyKey": "unique-key-123",
                "payloadHash": "abc123",
                "terminalId": "TERM1"
            }
            """.formatted(sessionId, adminUserId);

        mockMvc.perform(post("/api/v1/print-jobs")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jobRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("QUEUED"));
    }

    @Test
    void getPrintJob_ShouldReturnJobDetails() throws Exception {
        String token = getAuthToken();

        String entryRequest = """
            {
                "idempotencyKey": "print-entry-002",
                "plate": "XYZ789",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Ingreso para consulta de impresion"
            }
            """.formatted(rateId, adminUserId);

        var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andReturn();

        String entryResponse = entryResult.getResponse().getContentAsString();
            JsonNode entryJson = objectMapper.readTree(entryResponse);
            String sessionId = entryJson.path("sessionId").asText();

        String jobRequest = """
            {
                "sessionId": "%s",
                "operatorUserId": "%s",
                "documentType": "REPRINT",
                "idempotencyKey": "unique-key-456",
                "payloadHash": "def456",
                "terminalId": "TERM1"
            }
            """.formatted(sessionId, adminUserId);

        var jobResult = mockMvc.perform(post("/api/v1/print-jobs")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jobRequest))
                .andReturn();

        String jobResponse = jobResult.getResponse().getContentAsString();
            JsonNode jobJson = objectMapper.readTree(jobResponse);
            String jobId = jobJson.path("id").asText();

        mockMvc.perform(get("/api/v1/print-jobs/" + jobId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").exists());
    }
}