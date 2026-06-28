package com.parkflow.modules.auth.infrastructure.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.RefreshRequest;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.security.PasswordHashService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.Cookie;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private AppUserPort appUserRepository;

  @Autowired
  private PasswordHashService passwordHashService;

  private AppUser testUser;
  private final String rawPassword = "SecurePassword123!";

  @BeforeEach
  void setUp() {
    testUser = new AppUser();
    testUser.setEmail("integration@parkflow.com");
    testUser.setPasswordHash(passwordHashService.encodePassword(rawPassword));
    testUser.setCompanyId(UUID.randomUUID());
    testUser.setRole(UserRole.ADMIN);
    testUser.setActive(true);
    testUser.setBlocked(false);
    appUserRepository.save(testUser);
  }

  @Test
  @DisplayName("Login - Happy path returns 200 OK and sets cookies")
  void testLogin_Success() throws Exception {
    LoginRequest loginRequest = new LoginRequest(
        "integration@parkflow.com",
        rawPassword,
        "test-device-id",
        "Test Device",
        "Integration Test OS",
        "test-fingerprint",
        24
    );

    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.email").value("integration@parkflow.com"))
        .andExpect(cookie().exists("parkflow_access"))
        .andExpect(cookie().exists("parkflow_refresh"));
  }

  @Test
  @DisplayName("Login - Invalid credentials returns 401 Unauthorized")
  void testLogin_InvalidCredentials() throws Exception {
    LoginRequest loginRequest = new LoginRequest(
        "integration@parkflow.com",
        "wrongpassword",
        "test-device-id",
        "Test Device",
        "Integration Test OS",
        "test-fingerprint",
        24
    );

    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTH_INVALID_CREDENTIALS"));
  }

  @Test
  @DisplayName("Protected Endpoint - Access without token returns 401")
  void testProtectedEndpoint_WithoutToken() throws Exception {
    mockMvc.perform(get("/api/v1/auth/me"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Refresh - Missing refresh token returns 401")
  void testRefresh_MissingCookie() throws Exception {
    RefreshRequest refreshRequest = new RefreshRequest("test-device-id");

    mockMvc.perform(post("/api/v1/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(refreshRequest)))
        .andExpect(status().isUnauthorized());
  }
}
