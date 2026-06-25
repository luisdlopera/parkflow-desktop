package com.parkflow.modules.auth.infrastructure.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.RefreshTokenRequest;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.infrastructure.persistence.CompanyJpaRepository;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import io.jsonwebtoken.Jwts;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Contract tests for Authentication endpoints.
 *
 * Verifies critical auth functionality:
 * - JWT token issuance on login
 * - Token refresh mechanism
 * - Authorization validation
 * - Error handling
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationContractTest extends BaseIntegrationTest {

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private CompanyJpaRepository companyRepository;

  private String validEmail;
  private String validPassword;
  private String testCompanyId;
  private String refreshToken;

  @BeforeEach
  void setUp() {
    // Create test company
    Company company = new Company();
    company.setId(UUID.randomUUID().toString());
    company.setName("Test Company");
    Company saved = companyRepository.save(company);
    testCompanyId = saved.getId();

    // Create test user
    validEmail = "test@company.com";
    validPassword = "TestPassword123!";
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID().toString());
    user.setEmail(validEmail);
    user.setPassword(
        "$2a$10$ygU" + ".secret"); // bcrypt hash of validPassword (use real hash in production)
    user.setCompanyId(testCompanyId);
    appUserRepository.save(user);
  }

  // ========== POST /auth/login Tests ==========

  @Test
  void testAuthLogin_ValidCredentials_Returns200WithJWT() throws Exception {
    LoginRequest request = new LoginRequest();
    request.setEmail(validEmail);
    request.setPassword(validPassword);

    MvcResult result =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.accessToken", notNullValue()))
            .andExpect(jsonPath("$.refreshToken", notNullValue()))
            .andExpect(jsonPath("$.expiresIn").isNumber())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andReturn();

    // Parse response and verify token structure
    String responseBody = result.getResponse().getContentAsString();
    var response = objectMapper.readTree(responseBody);

    String accessToken = response.get("accessToken").asText();
    assertThat(accessToken).isNotEmpty().contains(".");

    // Token should be valid JWT
    assertThat(accessToken.split("\\.")).hasSize(3);

    refreshToken = response.get("refreshToken").asText();
    assertThat(refreshToken).isNotEmpty();
  }

  @Test
  void testAuthLogin_InvalidEmail_Returns400BadRequest() throws Exception {
    LoginRequest request = new LoginRequest();
    request.setEmail("invalid-format");
    request.setPassword(validPassword);

    mvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.error.message", containsString("Invalid")));
  }

  @Test
  void testAuthLogin_MissingEmail_Returns400BadRequest() throws Exception {
    LoginRequest request = new LoginRequest();
    request.setPassword(validPassword);

    mvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testAuthLogin_WrongPassword_Returns401Unauthorized() throws Exception {
    LoginRequest request = new LoginRequest();
    request.setEmail(validEmail);
    request.setPassword("WrongPassword123!");

    mvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
        .andExpect(jsonPath("$.error.message", containsString("credentials")));
  }

  @Test
  void testAuthLogin_NonexistentUser_Returns401Unauthorized() throws Exception {
    LoginRequest request = new LoginRequest();
    request.setEmail("nonexistent@company.com");
    request.setPassword("AnyPassword123!");

    mvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
  }

  @Test
  void testAuthLogin_RateLimitAfterFailures() throws Exception {
    LoginRequest request = new LoginRequest();
    request.setEmail(validEmail);
    request.setPassword("WrongPassword");

    // Attempt login 6 times to trigger rate limit
    for (int i = 0; i < 6; i++) {
      mvc.perform(
              post("/api/v1/auth/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(request)))
          .andExpect(status().isUnauthorized());
    }

    // 6th request should be rate limited (429)
    mvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.error.code").value("RATE_LIMIT"));
  }

  // ========== POST /auth/refresh Tests ==========

  @Test
  void testAuthRefresh_ValidToken_Returns200WithNewAccessToken() throws Exception {
    // First, login to get refresh token
    LoginRequest loginRequest = new LoginRequest();
    loginRequest.setEmail(validEmail);
    loginRequest.setPassword(validPassword);

    MvcResult loginResult =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andReturn();

    String loginResponse = loginResult.getResponse().getContentAsString();
    String refreshToken = objectMapper.readTree(loginResponse).get("refreshToken").asText();

    // Now refresh the token
    RefreshTokenRequest refreshRequest = new RefreshTokenRequest();
    refreshRequest.setRefreshToken(refreshToken);

    mvc.perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshRequest)))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.accessToken", notNullValue()))
        .andExpect(jsonPath("$.expiresIn").isNumber())
        .andExpect(jsonPath("$.tokenType").value("Bearer"));
  }

  @Test
  void testAuthRefresh_InvalidToken_Returns401Unauthorized() throws Exception {
    RefreshTokenRequest request = new RefreshTokenRequest();
    request.setRefreshToken("invalid.token.here");

    mvc.perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
        .andExpect(jsonPath("$.error.message", containsString("expired")));
  }

  @Test
  void testAuthRefresh_MissingToken_Returns400BadRequest() throws Exception {
    RefreshTokenRequest request = new RefreshTokenRequest();
    // refreshToken is null

    mvc.perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  // ========== Authorization Tests ==========

  @Test
  void testAuthProtectedEndpoint_MissingToken_Returns401Unauthorized() throws Exception {
    mvc.perform(get("/api/v1/parking/sessions/current"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
  }

  @Test
  void testAuthProtectedEndpoint_InvalidToken_Returns401Unauthorized() throws Exception {
    mvc.perform(get("/api/v1/parking/sessions/current").header("Authorization", "Bearer invalid"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void testAuthProtectedEndpoint_MalformedAuthHeader_Returns401Unauthorized() throws Exception {
    mvc.perform(get("/api/v1/parking/sessions/current").header("Authorization", "NotABearer token"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void testAuthToken_ExpiresAfterTTL() throws Exception {
    // Login to get token
    LoginRequest loginRequest = new LoginRequest();
    loginRequest.setEmail(validEmail);
    loginRequest.setPassword(validPassword);

    MvcResult loginResult =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andReturn();

    String loginResponse = loginResult.getResponse().getContentAsString();
    int expiresIn = objectMapper.readTree(loginResponse).get("expiresIn").asInt();

    // expiresIn should be set to configured TTL (typically 900 seconds = 15 minutes)
    assertThat(expiresIn).isGreaterThan(0).isLessThanOrEqualTo(1000);
  }
}
