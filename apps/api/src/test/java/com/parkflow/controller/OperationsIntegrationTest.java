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
                "observations": "Ingreso de prueba",
                "vehicleCondition": "Sin novedades"
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
                "observations": "Salida de prueba",
                "vehicleCondition": "Sin novedades"
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
                "observations": "Salida de prueba",
                "vehicleCondition": "Sin novedades"
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
    void registerEntry_ShouldReturn400_WhenIdempotencyKeyMissing() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "plate": "IDM001",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Sin idempotency",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").exists());
    }

    @Test
    void registerEntry_ShouldReturn409_WhenActiveSessionExists() throws Exception {
        String token = getAuthToken();
        String plate = "DUPE99";
        String baseRequest = """
            {
                "idempotencyKey": "%s",
                "plate": "%s",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Duplicado",
                "vehicleCondition": "Sin novedades"
            }
            """;

        String firstKey = "dup-first-" + System.currentTimeMillis();
        String firstRequest = baseRequest.formatted(firstKey, plate, rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(firstRequest))
                .andExpect(status().isCreated());

        String secondKey = "dup-second-" + System.currentTimeMillis();
        String secondRequest = baseRequest.formatted(secondKey, plate, rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(secondRequest))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
    }

    @Test
    void registerEntry_ShouldReturn400_WhenConditionAllEmpty() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "empty-cond-%s",
                "plate": "COND00",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Sin condicion"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
    }

    @Test
    void registerEntry_ShouldBeIdempotent_OnRetry() throws Exception {
        String token = getAuthToken();
        String idempotencyKey = "idemp-retry-" + System.currentTimeMillis();
        String entryRequest = """
            {
                "idempotencyKey": "%s",
                "plate": "RETRY1",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Retry test",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(idempotencyKey, rateId, adminUserId);

        var firstResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists())
                .andReturn();

        String firstSessionId = objectMapper.readTree(firstResult.getResponse().getContentAsString())
            .path("sessionId").asText();

        var secondResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists())
                .andReturn();

        String secondSessionId = objectMapper.readTree(secondResult.getResponse().getContentAsString())
            .path("sessionId").asText();

        org.assertj.core.api.Assertions.assertThat(secondSessionId).isEqualTo(firstSessionId);
    }

    @Test
    void registerEntry_ShouldResolveRate_WhenNoRateId() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "no-rate-id-%s",
                "plate": "NORAT",
                "type": "CAR",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Sin rateId",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists())
                .andExpect(jsonPath("$.receipt.rateName").exists());
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
                "observations": "Ingreso concurrente",
                "vehicleCondition": "Sin novedades"
            }
            """;

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest.formatted(Thread.currentThread().getId(), Thread.currentThread().getId(), rateId, adminUserId)))
                .andExpect(status().isCreated());
    }
}