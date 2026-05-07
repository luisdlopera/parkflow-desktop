package com.parkflow.modules.configuration.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ConfigurationCrudAuthorizationIntegrationTest {

  @Autowired private MockMvc mockMvc;

  @Test
  void shouldRejectUnauthenticatedWriteOperations() throws Exception {
    mockMvc
        .perform(post("/api/v1/configuration/payment-methods").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "OPERADOR")
  void shouldRejectOperatorWriteOperations() throws Exception {
    mockMvc
        .perform(post("/api/v1/configuration/vehicle-types").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(post("/api/v1/configuration/rates").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(post("/api/v1/configuration/payment-methods").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(post("/api/v1/configuration/printers").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(post("/api/v1/configuration/cash-registers").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            post("/api/v1/configuration/parking-sites")
                .param("companyId", "00000000-0000-0000-0000-000000000001")
                .contentType(APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            post("/api/v1/configuration/operational-parameters")
                .param("siteId", "00000000-0000-0000-0000-000000000001")
                .contentType(APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void shouldAllowAdminWriteToReachValidationLayer() throws Exception {
    mockMvc
        .perform(post("/api/v1/configuration/vehicle-types").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest());
  }
}
