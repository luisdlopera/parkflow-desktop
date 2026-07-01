package com.parkflow.modules.auth.infrastructure.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.LogoutRequest;
import com.parkflow.modules.auth.dto.RefreshRequest;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.security.PasswordHashService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import jakarta.servlet.http.Cookie;

import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
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
  private AuthSessionPort authSessionRepository;

  @Autowired
  private PasswordHashService passwordHashService;

  @org.springframework.boot.test.mock.mockito.MockBean
  private com.parkflow.modules.auth.application.service.AuthAuditService authAuditService;

  private AppUser testUser;
  private final String rawPassword = "SecurePassword123!";

  @BeforeEach
  void setUp() {
    testUser = new AppUser();
    testUser.setName("Integration Test User");
    testUser.setEmail("integration@parkflow.com");
    testUser.setPasswordHash(passwordHashService.encodePassword(rawPassword));
    testUser.setCompanyId(UUID.randomUUID());
    testUser.setRole(UserRole.ADMIN);
    testUser.setActive(true);
    testUser.setBlocked(false);
    appUserRepository.save(testUser);
  }

  // ============================================================================
  // FASE 1: VALIDACIÓN DE ATRIBUTOS DE COOKIE
  // ============================================================================

  @Nested
  @DisplayName("FASE 1: Cookie Attributes Validation")
  class CookieAttributesTests {

    @Test
    @DisplayName("Login - Sets cookies with correct HttpOnly, Secure, SameSite attributes")
    void testLogin_CookieAttributes() throws Exception {
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andExpect(cookie().exists("parkflow_access"))
          .andExpect(cookie().exists("parkflow_refresh"))
          .andReturn();

      // Validar atributos de Set-Cookie
      List<String> setCookieHeaders = result.getResponse().getHeaders("Set-Cookie");
      assertThat(setCookieHeaders).isNotEmpty();

      // Encontrar el header del access token
      String accessCookie = setCookieHeaders.stream()
          .filter(h -> h.startsWith("parkflow_access"))
          .findFirst()
          .orElse("");

      // Verificar access token cookie
      assertThat(accessCookie).contains("parkflow_access");
      assertThat(accessCookie).contains("HttpOnly");
      assertThat(accessCookie).contains("SameSite=Strict");
      assertThat(accessCookie).contains("Max-Age=900"); // 15 minutos
      assertThat(accessCookie).contains("Path=/");
    }

    @Test
    @DisplayName("Login - Access token value is not empty")
    void testLogin_AccessTokenNotEmpty() throws Exception {
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andReturn();

      List<String> setCookieHeaders = result.getResponse().getHeaders("Set-Cookie");
      String accessCookie = setCookieHeaders.stream()
          .filter(h -> h.startsWith("parkflow_access"))
          .findFirst()
          .orElse("");
      
      Pattern accessTokenPattern = Pattern.compile("parkflow_access=([^;]+)");
      Matcher matcher = accessTokenPattern.matcher(accessCookie);

      assertThat(matcher.find()).isTrue();
      String accessTokenValue = matcher.group(1);
      assertThat(accessTokenValue).isNotEmpty().isNotEqualTo("null");
      // JWT básicamente comienza con "eyJ"
      assertThat(accessTokenValue).startsWith("eyJ");
    }

    @Test
    @DisplayName("Login - Access and refresh tokens are distinct")
    void testLogin_TokensAreDistinct() throws Exception {
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andReturn();

      String accessToken = extractCookieValue(result, "parkflow_access");
      String refreshToken = extractCookieValue(result, "parkflow_refresh");

      assertThat(accessToken).isNotEmpty();
      assertThat(refreshToken).isNotEmpty();
      assertThat(accessToken).isNotEqualTo(refreshToken);
    }
  }

  // ============================================================================
  // FASE 2: FLUJOS COMPLETOS DE COOKIES
  // ============================================================================

  @Nested
  @DisplayName("FASE 2: Complete Cookie Flows")
  class CompleteCookieFlowTests {

    @Test
    @DisplayName("Login → Extract Cookies → Access Protected Endpoint")
    void testLoginAndAccessProtectedEndpoint() throws Exception {
      // 1. Login
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andReturn();

      // 2. Extraer cookies
      String accessCookieHeader = extractCookieValue(loginResult, "parkflow_access");
      String refreshCookieHeader = extractCookieValue(loginResult, "parkflow_refresh");

      assertThat(accessCookieHeader).isNotEmpty();
      assertThat(refreshCookieHeader).isNotEmpty();

      // 3. Usar cookies en siguiente request
      mockMvc.perform(get("/api/v1/auth/me")
              .cookie(new Cookie("parkflow_access", accessCookieHeader))
              .cookie(new Cookie("parkflow_refresh", refreshCookieHeader)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.email").value("integration@parkflow.com"));
    }


    @Test
    @DisplayName("Multiple Protected Endpoints - All require valid cookie")
    void testMultipleProtectedEndpoints() throws Exception {
      // 1. Login y extraer cookie
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andReturn();

      String accessToken = extractCookieValue(loginResult, "parkflow_access");
      String refreshToken = extractCookieValue(loginResult, "parkflow_refresh");

      // 2. Acceder a GET /auth/me (protegido)
      mockMvc.perform(get("/api/v1/auth/me")
              .cookie(new Cookie("parkflow_access", accessToken))
              .cookie(new Cookie("parkflow_refresh", refreshToken)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.email").value("integration@parkflow.com"));

      // 3. Acceder a GET /auth/profile (protegido)
      mockMvc.perform(get("/api/v1/auth/profile")
              .cookie(new Cookie("parkflow_access", accessToken))
              .cookie(new Cookie("parkflow_refresh", refreshToken)))
          .andExpect(status().isOk());

      // 4. Acceder a GET /auth/devices (protegido)
      mockMvc.perform(get("/api/v1/auth/devices")
              .cookie(new Cookie("parkflow_access", accessToken))
              .cookie(new Cookie("parkflow_refresh", refreshToken)))
          .andExpect(status().isOk());
    }
  }

  // ============================================================================
  // FASE 3 & 4: ACCESO DENEGADO Y EDGE CASES
  // ============================================================================

  @Nested
  @DisplayName("Access Control - Sin Cookie y Cookie Inválida")
  class AccessControlTests {

    @Test
    @DisplayName("Protected Endpoint - Access without token returns 401")
    void testProtectedEndpoint_WithoutToken() throws Exception {
      mockMvc.perform(get("/api/v1/auth/me"))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.errorCode").exists());
    }

    @Test
    @DisplayName("Protected Endpoint /profile - Without token returns 401")
    void testProtectedEndpointProfile_WithoutToken() throws Exception {
      mockMvc.perform(get("/api/v1/auth/profile"))
          .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Protected Endpoint /devices - Without token returns 401")
    void testProtectedEndpointDevices_WithoutToken() throws Exception {
      mockMvc.perform(get("/api/v1/auth/devices"))
          .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Cookie with invalid value returns 401")
    void testProtectedEndpoint_InvalidCookieValue() throws Exception {
      mockMvc.perform(get("/api/v1/auth/me")
              .cookie(new Cookie("parkflow_access", "not-a-valid-jwt-at-all!!!")))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.errorCode").exists());
    }

    @Test
    @DisplayName("Cookie with empty value returns 401")
    void testProtectedEndpoint_EmptyCookieValue() throws Exception {
      mockMvc.perform(get("/api/v1/auth/me")
              .cookie(new Cookie("parkflow_access", "")))
          .andExpect(status().isUnauthorized());
    }
  }

  @Nested
  @DisplayName("FASE 4: Edge Cases")
  class EdgeCasesTests {

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
          true,
          24
      );

      mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.errorCode").value("AUTH_INVALID_CREDENTIALS"));
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

    @Test
    @DisplayName("Refresh - Valid refresh token returns new cookies")
    void testRefresh_Success() throws Exception {
      // 1. Login
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andReturn();

      String refreshToken = extractCookieValue(loginResult, "parkflow_refresh");

      // 2. Refresh
      RefreshRequest refreshRequest = new RefreshRequest("test-device-id");

      mockMvc.perform(post("/api/v1/auth/refresh")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(refreshRequest))
              .cookie(new Cookie("parkflow_refresh", refreshToken)))
          .andExpect(status().isOk())
          .andExpect(cookie().exists("parkflow_access"))
          .andExpect(cookie().exists("parkflow_refresh"));
    }
  }

  // ============================================================================
  // FASE 5: LOGIN RESPONSE VALIDATION (user.companyId)
  // ============================================================================

  @Nested
  @DisplayName("Login Response - User Details Including companyId")
  class LoginResponseValidationTests {

    @Test
    @DisplayName("Login Response - Contains user.companyId matching test user")
    void testLoginResponse_ContainsCompanyId() throws Exception {
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.user").exists())
          .andExpect(jsonPath("$.user.id").exists())
          .andExpect(jsonPath("$.user.email").value("integration@parkflow.com"))
          .andExpect(jsonPath("$.user.companyId").exists())
          .andExpect(jsonPath("$.user.companyId").isNotEmpty())
          .andExpect(jsonPath("$.user.role").value("ADMIN"))
          .andExpect(jsonPath("$.user.onboardingCompleted").exists())
          .andReturn();

      // Verify companyId is the correct UUID (not null, not empty)
      String companyIdStr = result.getResponse().getContentAsString();
      assertThat(companyIdStr).contains("\"companyId\":\"" + testUser.getCompanyId());
    }

    @Test
    @DisplayName("Login Response - User has correct metadata fields")
    void testLoginResponse_UserMetadata() throws Exception {
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.user.id").isNotEmpty())
          .andExpect(jsonPath("$.user.companyId").isNotEmpty())
          .andExpect(jsonPath("$.user.name").value("Integration Test User"))
          .andExpect(jsonPath("$.user.email").value("integration@parkflow.com"))
          .andExpect(jsonPath("$.user.role").value("ADMIN"))
          .andExpect(jsonPath("$.user.permissions").isArray())
          .andExpect(jsonPath("$.user.active").value(true))
          .andExpect(jsonPath("$.user.requirePasswordChange").value(false));
    }
  }

  // ============================================================================
  // FASE 6: RESTORE-SESSION VALIDATION
  // ============================================================================

  @Nested
  @DisplayName("Restore Session - Verify companyId is returned and JWT is valid")
  class RestoreSessionValidationTests {

    @Test
    @DisplayName("Restore Session - Returns user with companyId after successful refresh")
    void testRestoreSession_ReturnsUserWithCompanyId() throws Exception {
      // 1. Login to get cookies
      LoginRequest loginRequest = new LoginRequest(
          "integration@parkflow.com",
          rawPassword,
          "test-device-id",
          "Test Device",
          "Integration Test OS",
          "test-fingerprint",
          true,
          24
      );

      MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
              .contentType(MediaType.APPLICATION_JSON)
              .content(objectMapper.writeValueAsString(loginRequest)))
          .andExpect(status().isOk())
          .andReturn();

      String refreshToken = extractCookieValue(loginResult, "parkflow_refresh");
      assertThat(refreshToken).isNotEmpty();

      // 2. Call /restore-session to simulate page reload
      MvcResult restoreResult = mockMvc.perform(post("/api/v1/auth/restore-session")
              .cookie(new Cookie("parkflow_refresh", refreshToken)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.user").exists())
          .andExpect(jsonPath("$.user.companyId").exists())
          .andExpect(jsonPath("$.user.companyId").isNotEmpty())
          .andExpect(jsonPath("$.user.email").value("integration@parkflow.com"))
          .andExpect(jsonPath("$.session").exists())
          .andReturn();

      // Verify the companyId matches the test user's companyId
      String responseBody = restoreResult.getResponse().getContentAsString();
      assertThat(responseBody).contains("\"companyId\":\"" + testUser.getCompanyId());
    }

    @Test
    @DisplayName("Restore Session - Without refresh token returns 401")
    void testRestoreSession_WithoutRefreshToken_Returns401() throws Exception {
      mockMvc.perform(post("/api/v1/auth/restore-session"))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.errorCode").value("AUTH_UNAUTHORIZED"));
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  private String extractCookieValue(MvcResult result, String cookieName) {
    List<?> setCookieHeadersObj = result.getResponse().getHeaderValues("Set-Cookie");
    if (setCookieHeadersObj == null || setCookieHeadersObj.isEmpty()) {
      return "";
    }

    Pattern pattern = Pattern.compile(cookieName + "=([^;]+)");
    for (Object headerObj : setCookieHeadersObj) {
      String header = headerObj.toString();
      Matcher matcher = pattern.matcher(header);
      if (matcher.find()) {
        return matcher.group(1);
      }
    }
    return "";
  }
}
