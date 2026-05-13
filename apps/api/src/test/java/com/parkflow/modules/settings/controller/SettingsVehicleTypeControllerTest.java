package com.parkflow.modules.settings.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SettingsVehicleTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Should allow public access to vehicle types list without authentication")
    void shouldAllowPublicAccessToVehicleTypes() throws Exception {
        mockMvc.perform(get("/api/v1/settings/vehicle-types"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should allow OPTIONS preflight without authentication")
    void shouldAllowOptionsPreflight() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/v1/settings/vehicle-types"))
                .andExpect(status().isOk());
    }
}
