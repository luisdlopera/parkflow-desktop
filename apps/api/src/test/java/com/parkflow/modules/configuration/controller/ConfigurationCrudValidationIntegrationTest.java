package com.parkflow.modules.configuration.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ConfigurationCrudValidationIntegrationTest {

  @Autowired private MockMvc mockMvc;

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Vehicle types should reject invalid payload")
  void vehicleTypesShouldRejectInvalidPayload() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/configuration/vehicle-types")
                .contentType(APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void paymentMethodsShouldRejectInvalidPayload() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/configuration/payment-methods")
                .contentType(APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void printersShouldRejectInvalidPayload() throws Exception {
    mockMvc
    .perform(post("/api/v1/configuration/printers")
        .param("siteId", "00000000-0000-0000-0000-000000000001")
        .contentType(APPLICATION_JSON)
        .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void cashRegistersShouldRejectInvalidPayload() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/configuration/cash-registers")
                .contentType(APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void parkingSitesShouldRejectInvalidPayload() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/configuration/parking-sites")
                .param("companyId", "00000000-0000-0000-0000-000000000001")
                .contentType(APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void operationalParametersShouldRejectInvalidPayload() throws Exception {
    mockMvc
        .perform(
        put("/api/v1/configuration/operational-parameters")
          .param("siteId", "00000000-0000-0000-0000-000000000001")
          .contentType(APPLICATION_JSON)
          .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void ratesShouldRejectInvalidPayload() throws Exception {
    mockMvc
        .perform(post("/api/v1/configuration/rates").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void companiesEndpointShouldBeReachableForListing() throws Exception {
    mockMvc.perform(get("/api/v1/licensing/companies")).andExpect(status().isOk());
  }
}
