package com.parkflow.modules.configuration.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConfigurationCrudEndpointsIntegrationTest {

  @Autowired private MockMvc mockMvc;

  @Test
  @DisplayName("Configuration CRUD endpoints for core catalogs are exposed")
  void shouldExposeConfigurationCrudEndpoints() throws Exception {
    assertEndpointExists("/api/v1/configuration/vehicle-types");
    assertEndpointExists("/api/v1/configuration/rates");
    assertEndpointExists("/api/v1/configuration/payment-methods");
    assertEndpointExists("/api/v1/configuration/printers");
    assertEndpointExists("/api/v1/configuration/cash-registers");
    assertEndpointExists("/api/v1/configuration/parking-sites");
    assertEndpointExists("/api/v1/configuration/operational-parameters");
    assertEndpointExists("/api/v1/licensing/companies");
  }

  private void assertEndpointExists(String endpoint) throws Exception {
    MvcResult result = mockMvc.perform(get(endpoint)).andReturn();
    int status = result.getResponse().getStatus();
    assertThat(status)
        .withFailMessage("Expected endpoint %s to be mapped, but got HTTP 404", endpoint)
        .isNotEqualTo(404);
  }
}
