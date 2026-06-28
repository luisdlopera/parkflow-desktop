package com.parkflow.modules.auth.infrastructure.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * CSRF Token Validation Integration Tests
 *
 * <p>Validates that CSRF protection is working correctly: - CSRF tokens are
 * generated on GET requests - POST/PUT/DELETE requests without valid CSRF tokens are
 * rejected (403) - POST/PUT/DELETE requests with valid CSRF tokens are allowed - Auth
 * endpoints are properly exempted from CSRF validation
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("CSRF Protection Integration Tests")
class CSRFIntegrationTest {

  @Autowired private MockMvc mockMvc;

  private String csrfToken;
  private Cookie csrfCookie;

  @BeforeEach
  void setUp() throws Exception {
    // Extract CSRF token from GET request (should generate token + cookie)
    MvcResult result =
        mockMvc
            .perform(get("/api/v1/auth/validate"))
            .andExpect(status().isUnauthorized()) // No auth, but CSRF token generated anyway
            .andReturn();

    // Extract CSRF token from cookies
    jakarta.servlet.http.Cookie[] cookies = result.getResponse().getCookies();
    for (jakarta.servlet.http.Cookie cookie : cookies) {
      if ("XSRF-TOKEN".equals(cookie.getName())) {
        csrfToken = cookie.getValue();
        csrfCookie = new Cookie("XSRF-TOKEN", csrfToken);
        break;
      }
    }
  }

  @Test
  @DisplayName("GET requests do NOT require CSRF token")
  void testGetRequestsExemptFromCsrf() throws Exception {
    mockMvc
        .perform(get("/api/v1/auth/validate"))
        .andExpect(status().isUnauthorized()) // Fails due to auth, not CSRF
        .andReturn();
  }

  @Test
  @DisplayName("POST without CSRF token is rejected with 403")
  void testPostWithoutCsrfToken() throws Exception {
    mockMvc
        .perform(post("/api/v1/auth/logout").contentType("application/json").content("{}"))
        .andExpect(status().isForbidden())
        .andExpect(status().reason(containsString("CSRF")));
  }

  @Test
  @DisplayName("POST with incorrect CSRF token is rejected with 403")
  void testPostWithIncorrectCsrfToken() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/logout")
                .contentType("application/json")
                .content("{}")
                .param("_csrf", "invalid-token-value")
                .cookie(new Cookie("XSRF-TOKEN", "invalid-token-value")))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("POST with valid CSRF token in parameter succeeds (with valid auth)")
  @WithMockUser(username = "test@example.com", roles = "ADMIN")
  void testPostWithValidCsrfTokenInParameter() throws Exception {
    // Get fresh CSRF token
    MvcResult getResult = mockMvc.perform(get("/api/v1/auth/validate")).andReturn();

    String csrfTokenParam = extractCsrfTokenFromResponse(getResult);

    mockMvc
        .perform(
            post("/api/v1/auth/logout")
                .contentType("application/json")
                .content("{}")
                .param("_csrf", csrfTokenParam)
                .cookie(new Cookie("XSRF-TOKEN", csrfTokenParam)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("POST with valid CSRF token in header succeeds (with valid auth)")
  @WithMockUser(username = "test@example.com", roles = "ADMIN")
  void testPostWithValidCsrfTokenInHeader() throws Exception {
    // Get fresh CSRF token
    MvcResult getResult = mockMvc.perform(get("/api/v1/auth/validate")).andReturn();
    String csrfTokenHeader = extractCsrfTokenFromResponse(getResult);

    mockMvc
        .perform(
            post("/api/v1/auth/logout")
                .contentType("application/json")
                .content("{}")
                .header("X-CSRF-TOKEN", csrfTokenHeader)
                .cookie(new Cookie("XSRF-TOKEN", csrfTokenHeader)))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Auth endpoints (login, refresh) are CSRF-exempt")
  void testAuthEndpointsExemptFromCsrf() throws Exception {
    // POST /auth/login without CSRF should NOT fail with 403
    // (Will fail with different status due to bad credentials, but not CSRF)
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType("application/json")
                .content(
                    "{\"email\":\"test@example.com\",\"password\":\"invalid\",\"deviceId\":\"test\",\"deviceName\":\"test\",\"platform\":\"WEB\",\"fingerprint\":\"test\"}"))
        .andExpect(status().is(org.hamcrest.Matchers.not(403))); // NOT Forbidden (CSRF)

    // POST /auth/refresh without CSRF should NOT fail with 403
    mockMvc
        .perform(
            post("/api/v1/auth/refresh")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().is(org.hamcrest.Matchers.not(403))); // NOT Forbidden (CSRF)
  }

  @Test
  @DisplayName("PUT requests require valid CSRF token")
  @WithMockUser(username = "test@example.com", roles = "ADMIN")
  void testPutRequiresCsrf() throws Exception {
    // PUT without CSRF should fail with 403
    mockMvc
        .perform(
            put("/api/v1/auth/profile")
                .contentType("application/json")
                .content("{}"))
        .andExpect(status().isForbidden());

    // PUT with valid CSRF should succeed (or fail with different status)
    MvcResult getResult = mockMvc.perform(get("/api/v1/auth/profile")).andReturn();
    String csrfTokenValid = extractCsrfTokenFromResponse(getResult);

    mockMvc
        .perform(
            put("/api/v1/auth/profile")
                .contentType("application/json")
                .content("{}")
                .param("_csrf", csrfTokenValid)
                .cookie(new Cookie("XSRF-TOKEN", csrfTokenValid)))
        .andExpect(status().is(org.hamcrest.Matchers.not(403))); // NOT Forbidden (CSRF)
  }

  @Test
  @DisplayName("DELETE requests require valid CSRF token")
  @WithMockUser(username = "test@example.com", roles = "SUPER_ADMIN")
  void testDeleteRequiresCsrf() throws Exception {
    // DELETE without CSRF should fail with 403
    mockMvc
        .perform(delete("/api/v1/auth/logout/device/device-123"))
        .andExpect(status().isForbidden());

    // DELETE with valid CSRF should succeed (or fail with different status)
    MvcResult getResult = mockMvc.perform(get("/api/v1/auth/validate")).andReturn();
    String csrfTokenValid = extractCsrfTokenFromResponse(getResult);

    mockMvc
        .perform(
            delete("/api/v1/auth/logout/device/device-123")
                .param("_csrf", csrfTokenValid)
                .cookie(new Cookie("XSRF-TOKEN", csrfTokenValid)))
        .andExpect(status().is(org.hamcrest.Matchers.not(403))); // NOT Forbidden (CSRF)
  }

  @Test
  @DisplayName("CSRF token is different for each session")
  void testCsrfTokensAreDifferentPerSession() throws Exception {
    MvcResult result1 = mockMvc.perform(get("/api/v1/auth/validate")).andReturn();
    String token1 = extractCsrfTokenFromResponse(result1);

    // Simulate different client/session
    MvcResult result2 = mockMvc.perform(get("/api/v1/auth/validate")).andReturn();
    String token2 = extractCsrfTokenFromResponse(result2);

    // Tokens should be different (new session)
    assert !token1.equals(token2)
        : "CSRF tokens should be unique per session/client";
  }

  @Test
  @DisplayName("CSRF token is NOT in response body (XSS protection)")
  void testCsrfTokenNotInResponseBody() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get("/api/v1/auth/validate"))
            .andExpect(status().isUnauthorized())
            .andReturn();

    String responseBody = result.getResponse().getContentAsString();
    // CSRF token should ONLY be in cookie, not in JSON response
    // (prevents XSS from stealing CSRF token via JavaScript)
    assert !responseBody.contains("XSRF-TOKEN")
        : "CSRF token should not be in response body (XSS risk)";
  }

  /**
   * Helper method to extract CSRF token from MockMvc response cookies
   */
  private String extractCsrfTokenFromResponse(MvcResult result) {
    jakarta.servlet.http.Cookie[] cookies = result.getResponse().getCookies();
    for (jakarta.servlet.http.Cookie cookie : cookies) {
      if ("XSRF-TOKEN".equals(cookie.getName())) {
        return cookie.getValue();
      }
    }
    throw new AssertionError("CSRF token cookie not found in response");
  }
}
