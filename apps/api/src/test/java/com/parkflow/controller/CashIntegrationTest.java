package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CashIntegrationTest extends BaseIntegrationTest {

    @Test
    void openCash_ShouldCreateSession_WhenValidRequest() throws Exception {
        String token = getAuthToken();
        String openRequest = """
            {
                "site": "Test Site",
                "terminal": "TERM1",
                "registerLabel": "Register 1",
                "openingAmount": 0,
                "operatorUserId": "%s",
                "openIdempotencyKey": "cash-open-001"
            }
            """;

        mockMvc.perform(post("/api/v1/cash/open")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(openRequest.formatted(adminUserId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void getCurrentCash_ShouldReturnSession_WhenOpen() throws Exception {
        // First open cash
        String token = getAuthToken();
        String openRequest = """
            {
                "site": "Test Site",
                "terminal": "TERM1",
                "registerLabel": "Register 1",
                "openingAmount": 0,
                "operatorUserId": "%s",
                "openIdempotencyKey": "cash-open-003"
            }
            """;

        mockMvc.perform(post("/api/v1/cash/open")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(openRequest.formatted(adminUserId)));

        // Now get current
        mockMvc.perform(get("/api/v1/cash/current")
            .header("Authorization", "Bearer " + token)
            .param("site", "Test Site")
            .param("terminal", "TERM1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void addMovement_ShouldRecordTransaction_WhenValid() throws Exception {
        // First open cash
        String token = getAuthToken();
        String openRequest = """
            {
                "site": "Test Site",
                "terminal": "TERM1",
                "registerLabel": "Register 1",
                "openingAmount": 0,
                "operatorUserId": "%s",
                "openIdempotencyKey": "cash-open-004"
            }
            """;

        var openResult = mockMvc.perform(post("/api/v1/cash/open")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(openRequest.formatted(adminUserId)))
                .andReturn();

        String openResponse = openResult.getResponse().getContentAsString();
        // Parse session id
        int start = openResponse.indexOf("\"id\":\"") + 6;
        int end = openResponse.indexOf("\"", start);
        String sessionId = openResponse.substring(start, end);

        // Add movement
        String movementRequest = """
            {
                "type": "MANUAL_INCOME",
                "paymentMethod": "CASH",
                "amount": 5000,
                "description": "Parking payment",
                "reason": "Parking payment",
                "externalReference": "TICKET123",
                "idempotencyKey": "cash-movement-001"
            }
            """;

        mockMvc.perform(post("/api/v1/cash/sessions/" + sessionId + "/movements")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(movementRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(5000));
    }
}