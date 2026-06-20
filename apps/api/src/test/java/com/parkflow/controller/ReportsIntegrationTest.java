package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ReportsIntegrationTest extends BaseIntegrationTest {

    @Test
    void getDailyReport_ShouldReturnReportData() throws Exception {
        String token = getAuthToken();

        mockMvc.perform(get("/api/v1/operations/supervisor/summary")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .param("timeZone", "America/Bogota"))
                .andExpect(status().isOk())
            .andExpect(jsonPath("$.entriesSinceMidnight").exists());
    }
}