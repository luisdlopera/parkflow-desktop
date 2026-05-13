package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SecurityIntegrationTest extends BaseIntegrationTest {

    @Test
    void sqlInjection_ShouldBeBlocked() throws Exception {
        String maliciousInput = "'; DROP TABLE users; --";

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + maliciousInput + "\",\"password\":\"pass\",\"deviceId\":\"sec-device\",\"deviceName\":\"Security Test\",\"platform\":\"desktop\",\"fingerprint\":\"sec-fingerprint\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void xss_ShouldBeSanitized() throws Exception {
        String xssInput = "<script>alert('xss')</script>";

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idempotencyKey\":\"sec-entry-001\",\"plate\":\"ABC123\",\"type\":\"CAR\",\"rateId\":\"" + rateId + "\",\"operatorUserId\":\"" + adminUserId + "\",\"site\":\"Test Site\",\"terminal\":\"TERM1\",\"observations\":\"" + xssInput + "\",\"vehicleCondition\":\"Sin novedades\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists())
                .andExpect(content().string(not(containsString("<script>"))));
    }
}