package com.parkflow.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.RequestBuilder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthIntegrationTest extends BaseIntegrationTest {
    private static final String DEVICE_ID = "auth-test-device";

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AuthSessionPort authSessionRepository;

    @BeforeEach
    void resetAuthTestDevice() {
        jdbcTemplate.update("DELETE FROM authorized_devices WHERE device_id = ?", DEVICE_ID);
    }

    @Test
    void login_ShouldReturnToken_WhenValidCredentials() throws Exception {
        mockMvc.perform(loginRequest("admin@example.com", "admin123", DEVICE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("admin@example.com"))
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.permissions", hasItem("tickets:emitir")))
                .andExpect(jsonPath("$.user.permissions", hasItem("devices:autorizar")))
                .andExpect(jsonPath("$.session.sessionId").isNotEmpty())
                .andExpect(jsonPath("$.session.deviceId").value(DEVICE_ID))
                .andExpect(jsonPath("$.device.authorized").value(true))
                .andExpect(jsonPath("$.offlineLease.maxHours").value(48));
    }

    @Test
    void login_ShouldReturn401_WhenInvalidCredentials() throws Exception {
        mockMvc.perform(loginRequest("admin@example.com", "wrong", DEVICE_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_ShouldValidateRequiredFields() throws Exception {
        String loginRequest = """
            {
                "email": "not-an-email",
                "password": "",
                "deviceId": "",
                "deviceName": "Auth Test Device",
                "platform": "desktop",
                "fingerprint": "auth-fingerprint"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void me_ShouldReturnCurrentUser_WhenAccessTokenIsValid() throws Exception {
        JsonNode login = login("admin@example.com", "admin123", DEVICE_ID);

        mockMvc.perform(get("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(login.path("accessToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(adminUserId.toString()))
                .andExpect(jsonPath("$.email").value("admin@example.com"))
                .andExpect(jsonPath("$.permissions", hasItem("configuracion:leer")));
    }

    @Test
    void refresh_ShouldRotateRefreshToken_AndRejectReusedToken() throws Exception {
        JsonNode login = login("admin@example.com", "admin123", DEVICE_ID);
        String originalRefreshToken = login.path("refreshToken").asText();
        String sessionId = login.path("session").path("sessionId").asText();

        JsonNode rotated = refresh(originalRefreshToken, DEVICE_ID);

        mockMvc.perform(get("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(rotated.path("accessToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@example.com"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(refreshJson(originalRefreshToken, DEVICE_ID)))
                .andExpect(status().isUnauthorized());

        expectSessionInactive(sessionId);
        org.junit.jupiter.api.Assertions.assertNotEquals(
                originalRefreshToken,
                rotated.path("refreshToken").asText());
    }

    @Test
    void refresh_ShouldRejectMismatchedDevice() throws Exception {
        JsonNode login = login("admin@example.com", "admin123", DEVICE_ID);

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(refreshJson(login.path("refreshToken").asText(), "other-device")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_ShouldDeactivateSession_AndRejectAccessTokenAfterLogout() throws Exception {
        JsonNode login = login("admin@example.com", "admin123", DEVICE_ID);
        String accessToken = login.path("accessToken").asText();
        String sessionId = login.path("session").path("sessionId").asText();

        mockMvc.perform(post("/api/v1/auth/logout")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "sessionId": "%s",
                      "refreshToken": "%s"
                    }
                    """.formatted(sessionId, login.path("refreshToken").asText())))
                .andExpect(status().isNoContent());

        expectSessionInactive(sessionId);
        mockMvc.perform(get("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void changePassword_ShouldValidateCurrentPasswordStrengthAndRevokeSessions() throws Exception {
        JsonNode login = login("admin@example.com", "admin123", DEVICE_ID);
        String accessToken = login.path("accessToken").asText();

        mockMvc.perform(post("/api/v1/auth/change-password")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "currentPassword": "wrong",
                      "newPassword": "Newpass.123"
                    }
                    """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/change-password")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "currentPassword": "admin123",
                      "newPassword": "weak"
                    }
                    """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/auth/change-password")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "currentPassword": "admin123",
                      "newPassword": "Newpass.123"
                    }
                    """))
                .andExpect(status().isNoContent());

        mockMvc.perform(loginRequest("admin@example.com", "admin123", "old-password-device"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(loginRequest("admin@example.com", "Newpass.123", "new-password-device"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void devices_ShouldRevokeAndAuthorizeDevice_WhenUserHasPermissions() throws Exception {
        JsonNode login = login("admin@example.com", "admin123", DEVICE_ID);
        String accessToken = login.path("accessToken").asText();

        mockMvc.perform(get("/api/v1/auth/devices")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].deviceId").value(DEVICE_ID));

        mockMvc.perform(post("/api/v1/auth/devices/revoke")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceDecisionJson(DEVICE_ID, "lost terminal")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deviceId").value(DEVICE_ID))
                .andExpect(jsonPath("$.authorized").value(false));

        mockMvc.perform(loginRequest("admin@example.com", "admin123", DEVICE_ID))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/auth/devices/authorize")
                .header(HttpHeaders.AUTHORIZATION, bearer(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceDecisionJson(DEVICE_ID, "found terminal")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorized").value(true))
                .andExpect(jsonPath("$.revokedAt").doesNotExist());

        mockMvc.perform(loginRequest("admin@example.com", "admin123", DEVICE_ID))
                .andExpect(status().isOk());
    }

    @Test
    void devices_ShouldRejectUsersWithoutDevicePermissions() throws Exception {
        var cashier = appUserRepository.findById(adminUserId).orElseThrow();
        cashier.setRole(com.parkflow.modules.auth.domain.UserRole.CAJERO);
        appUserRepository.save(cashier);
        JsonNode login = login("admin@example.com", "admin123", DEVICE_ID);

        mockMvc.perform(get("/api/v1/auth/devices")
                .header(HttpHeaders.AUTHORIZATION, bearer(login.path("accessToken").asText())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/auth/devices/revoke")
                .header(HttpHeaders.AUTHORIZATION, bearer(login.path("accessToken").asText()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceDecisionJson(DEVICE_ID, "not allowed")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(login.path("accessToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions", not(hasItem("devices:autorizar"))))
                .andExpect(jsonPath("$.permissions", not(hasItem("devices:revocar"))));
    }

    private RequestBuilder loginRequest(String email, String password, String deviceId) {
        return post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "%s",
                        "password": "%s",
                        "deviceId": "%s",
                        "deviceName": "Auth Test Device",
                        "platform": "desktop",
                        "fingerprint": "auth-fingerprint",
                        "offlineRequestedHours": 48
                    }
                    """.formatted(email, password, deviceId));
    }

    private JsonNode login(String email, String password, String deviceId) throws Exception {
        var result = mockMvc.perform(loginRequest(email, password, deviceId))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode refresh(String refreshToken, String deviceId) throws Exception {
        var result = mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(refreshJson(refreshToken, deviceId)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String refreshJson(String refreshToken, String deviceId) {
        return """
            {
              "refreshToken": "%s",
              "deviceId": "%s"
            }
            """.formatted(refreshToken, deviceId);
    }

    private String deviceDecisionJson(String deviceId, String reason) {
        return """
            {
              "deviceId": "%s",
              "reason": "%s"
            }
            """.formatted(deviceId, reason);
    }

    private String bearer(String accessToken) {
        return "Bearer " + accessToken;
    }

    private void expectSessionInactive(String sessionId) {
        var session = authSessionRepository.findById(java.util.UUID.fromString(sessionId)).orElseThrow();
        org.junit.jupiter.api.Assertions.assertFalse(session.isActive());
    }
}
