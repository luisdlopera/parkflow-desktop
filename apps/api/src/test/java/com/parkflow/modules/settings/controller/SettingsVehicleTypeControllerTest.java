package com.parkflow.modules.settings.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SettingsVehicleTypeControllerTest {

  @Autowired private MockMvc mockMvc;

  @Test
  @DisplayName("Should require authentication for vehicle types list")
  void shouldRequireAuthenticationForVehicleTypes() throws Exception {
    mockMvc.perform(get("/api/v1/settings/vehicle-types")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should allow authenticated access to vehicle types list")
  void shouldAllowAuthenticatedAccessToVehicleTypes() throws Exception {
    mockMvc.perform(get("/api/v1/settings/vehicle-types")).andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void shouldReachValidationLayerForInvalidPayload() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/settings/vehicle-types")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void shouldAllowOptionsPreflight() throws Exception {
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/v1/settings/vehicle-types"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void shouldAllowAuthenticatedWriteWithCsrfToReachValidationLayer() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/settings/vehicle-types")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }
}
