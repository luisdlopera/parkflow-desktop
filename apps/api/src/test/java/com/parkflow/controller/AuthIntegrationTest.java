package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthIntegrationTest extends BaseIntegrationTest {

    @Test
    void login_ShouldReturnToken_WhenValidCredentials() throws Exception {
        String loginRequest = """
            {
                "email": "admin@example.com",
                "password": "admin123",
                "deviceId": "auth-test-device",
                "deviceName": "Auth Test Device",
                "platform": "desktop",
                "fingerprint": "auth-fingerprint"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.email").value("admin@example.com"));
    }

    @Test
    void login_ShouldReturn401_WhenInvalidCredentials() throws Exception {
        String loginRequest = """
            {
                "email": "admin@example.com",
                "password": "wrong",
                "deviceId": "auth-test-device",
                "deviceName": "Auth Test Device",
                "platform": "desktop",
                "fingerprint": "auth-fingerprint"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isUnauthorized());
    }
}