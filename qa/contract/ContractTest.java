package com.parkflow.contract;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class ContractTest extends BaseIntegrationTest {

    @Test
    void authLoginContract_ReturnsExpectedShape() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "email": "admin@parkflow.local",
                                    "password": "Admin123!",
                                    "deviceId": "contract-test-device"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.refreshToken").isString())
                .andExpect(jsonPath("$.user").isMap())
                .andExpect(jsonPath("$.user.id").isString())
                .andExpect(jsonPath("$.user.email").isString())
                .andExpect(jsonPath("$.user.role").isString())
                .andExpect(jsonPath("$.session").isMap())
                .andExpect(jsonPath("$.session.sessionId").isString())
                .andExpect(jsonPath("$.session.accessTokenExpiresAtIso").isString());
    }

    @Test
    void operationsSummaryContract_ReturnsExpectedShape() throws Exception {
        mockMvc.perform(get("/api/v1/operations/supervisor/summary")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeVehicles").isNumber())
                .andExpect(jsonPath("$.totalCapacity").isNumber())
                .andExpect(jsonPath("$.availableSpaces").isNumber())
                .andExpect(jsonPath("$.occupancyPercent").isNumber());
    }

    @Test
    void operationsEntryContract_AcceptsMinimalPayload() throws Exception {
        mockMvc.perform(post("/api/v1/operations/entries")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "plate": "CONTRACT123",
                                    "vehicleType": "CAR"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").isString())
                .andExpect(jsonPath("$.receipt").isMap())
                .andExpect(jsonPath("$.receipt.ticketNumber").isString())
                .andExpect(jsonPath("$.receipt.plate").value("CONTRACT123"))
                .andExpect(jsonPath("$.receipt.entryAt").isString());
    }

    @Test
    void healthCheckContract_ReturnsExpectedShape() throws Exception {
        mockMvc.perform(get("/api/v1/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void operationalHealthContract_ReturnsExpectedShape() throws Exception {
        mockMvc.perform(get("/api/v1/health/operational")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallStatus").isString())
                .andExpect(jsonPath("$.apiStatus").isString())
                .andExpect(jsonPath("$.databaseStatus").isString());
    }

    @Test
    void vehicleTypesContract_ReturnsArray() throws Exception {
        mockMvc.perform(get("/api/v1/configuration/vehicle-types")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void activeSessionsContract_ReturnsArray() throws Exception {
        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                        .header("Authorization", "Bearer " + getAuthToken())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
