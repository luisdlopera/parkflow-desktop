package com.parkflow.modules.configuration.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * Integration tests for ConfigurationParkingSiteController, ConfigurationPaymentMethodController,
 * ConfigurationPrepaidController, ConfigurationVehicleTypeController and related endpoints.
 * 
 * Uses BaseIntegrationTest which authenticates via login cookie.
 */
class ConfigurationControllersIntegrationTest extends BaseIntegrationTest {

  // ====================================================================
  // Parking Sites
  // ====================================================================

  @Test
  @DisplayName("GET /parking-sites - anon must be 401")
  void parkingSite_list_unauthenticated() throws Exception {
    mockMvc.perform(get("/api/v1/configuration/parking-sites"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("GET /parking-sites - authenticated returns 200")
  void parkingSite_list_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/parking-sites")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("GET /parking-sites/{id} - authenticated returns site")
  void parkingSite_get_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/parking-sites/" + siteId)
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("GET /parking-sites/{id} - not found returns 404")
  void parkingSite_get_notFound() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/parking-sites/" + UUID.randomUUID())
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("PUT /parking-sites/{id} - update returns 200")
  void parkingSite_update_authenticated() throws Exception {
    String token = getAuthToken();
    String body = objectMapper.writeValueAsString(
        new ParkingSiteRequest("US1", "Updated Site", null, null, null, null, "America/Bogota", "COP", null, true));
    mockMvc.perform(put("/api/v1/configuration/parking-sites/" + siteId)
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("PATCH /parking-sites/{id}/status - patch returns 200")
  void parkingSite_patchStatus_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(patch("/api/v1/configuration/parking-sites/" + siteId + "/status")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .param("active", "false"))
        .andExpect(status().isOk());
  }

  // ====================================================================
  // Payment Methods
  // ====================================================================

  @Test
  @DisplayName("GET /payment-methods - unauthenticated returns 401")
  void paymentMethod_list_unauthenticated() throws Exception {
    mockMvc.perform(get("/api/v1/configuration/payment-methods"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("GET /payment-methods - authenticated returns 200")
  void paymentMethod_list_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/payment-methods")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("POST /payment-methods - create valid returns 201")
  void paymentMethod_create_authenticated() throws Exception {
    String token = getAuthToken();
    String body = """
        {"code": "CASH2", "name": "Cash", "isActive": true}
        """;
    mockMvc.perform(post("/api/v1/configuration/payment-methods")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isCreated());
  }

  // ====================================================================
  // Vehicle Types
  // ====================================================================

  @Test
  @DisplayName("GET /vehicle-types - unauthenticated returns 401")
  void vehicleType_list_unauthenticated() throws Exception {
    mockMvc.perform(get("/api/v1/configuration/vehicle-types"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("GET /vehicle-types - authenticated returns list")
  void vehicleType_list_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/vehicle-types")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("POST /vehicle-types - create returns 201")
  void vehicleType_create_authenticated() throws Exception {
    String token = getAuthToken();
    String body = """
        {"code": "CAR", "name": "Automovil"}
        """;
    mockMvc.perform(post("/api/v1/configuration/vehicle-types")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isCreated());
  }

  // ====================================================================
  // Configuration Rates
  // ====================================================================

  @Test
  @DisplayName("GET /rates - unauthenticated returns 401")
  void rates_list_unauthenticated() throws Exception {
    mockMvc.perform(get("/api/v1/configuration/rates"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("GET /rates - authenticated returns 200")
  void rates_list_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/rates")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("GET /rates/{id} - authenticated returns rate")
  void rates_get_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/rates/" + rateId)
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk());
  }

  // ====================================================================
  // Feature Configuration
  // ====================================================================

  @Test
  @DisplayName("GET /feature-configuration - unauthenticated returns 401")
  void featureConfig_unauthenticated() throws Exception {
    mockMvc.perform(get("/api/v1/configuration/features"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("GET /feature-configuration - authenticated returns 200")
  void featureConfig_authenticated() throws Exception {
    String token = getAuthToken();
    mockMvc.perform(get("/api/v1/configuration/features")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk());
  }
}
