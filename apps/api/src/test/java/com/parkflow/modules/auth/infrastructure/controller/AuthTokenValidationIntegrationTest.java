package com.parkflow.modules.auth.infrastructure.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.domain.repository.RefreshTokenFamilyPort;
import com.parkflow.modules.auth.dto.LoginRequest;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Auth Token Validation - Refresh Token Family Integrity")
class AuthTokenValidationIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private AppUserPort appUserRepository;

  @Autowired
  private RefreshTokenFamilyPort refreshTokenFamilyRepository;

  @Autowired
  private PasswordHashService passwordHashService;

  @org.springframework.boot.test.mock.mockito.MockBean
  private com.parkflow.modules.auth.application.service.AuthAuditService authAuditService;

  private AppUser testUser;
  private final String rawPassword = "SecurePassword123!";

  @BeforeEach
  void setUp() {
    testUser = new AppUser();
    testUser.setName("Token Test User");
    testUser.setEmail("token-test@parkflow.com");
    testUser.setPasswordHash(passwordHashService.encodePassword(rawPassword));
    testUser.setCompanyId(UUID.randomUUID());
    testUser.setRole(UserRole.ADMIN);
    testUser.setActive(true);
    testUser.setBlocked(false);
    appUserRepository.save(testUser);
  }

  @Test
  @DisplayName("CRITICAL BUG FIX: Login creates RefreshTokenFamily with user_id correctly set (NOT NULL)")
  void testLogin_CreatesRefreshTokenFamilyWithUserId() throws Exception {
    // BUG: Previously, setUserId() was used instead of setUser(),
    // causing user_id to be NULL in database (violating NOT NULL constraint)
    // This resulted in: HTTP 409 error "null value in column user_id violates not-null constraint"

    LoginRequest loginRequest = new LoginRequest(
        "token-test@parkflow.com",
        rawPassword,
        "test-device-1",
        "Test Device",
        "web",
        "test-fingerprint",
        true,
        24
    );

    MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
        .andExpect(status().isOk())
        .andReturn();

    String responseBody = result.getResponse().getContentAsString();
    assertThat(responseBody).contains("\"sessionId\"");

    String familyId = objectMapper.readTree(responseBody)
        .get("session").get("tokenFamilyId").asText();

    var familyOpt = refreshTokenFamilyRepository.findById(UUID.fromString(familyId));
    assertThat(familyOpt).isPresent();

    RefreshTokenFamily family = familyOpt.get();

    // CRITICAL: Verify user_id is available through the entity's relationship
    // (The bug was that user_id was NULL when set via setUserId() instead of setUser())
    UUID userIdFromEntity = family.getUserId();

    assertThat(userIdFromEntity)
        .as("user_id must NOT be NULL (this was the bug: HTTP 409 'null value violates NOT NULL constraint')")
        .isNotNull();

    assertThat(userIdFromEntity)
        .as("user_id must match the authenticated user")
        .isEqualTo(testUser.getId());

    // Also verify other JPA fields are correctly set
    assertThat(family.getCompanyId())
        .as("company_id must be set")
        .isEqualTo(testUser.getCompanyId());

    assertThat(family.getGenerationNumber())
        .as("generation_number must start at 1")
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Multiple logins create separate RefreshTokenFamilies with correct user_id")
  void testLogin_MultipleLoginsCreateSeparateFamilies() throws Exception {
    // Login 1
    LoginRequest login1 = new LoginRequest(
        "token-test@parkflow.com", rawPassword, "device-1", "Device 1", "web", "fp1", true, 24);

    MvcResult result1 = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login1)))
        .andExpect(status().isOk())
        .andReturn();

    String familyId1 = objectMapper.readTree(result1.getResponse().getContentAsString())
        .get("session").get("tokenFamilyId").asText();

    // Login 2 (different device)
    LoginRequest login2 = new LoginRequest(
        "token-test@parkflow.com", rawPassword, "device-2", "Device 2", "mobile", "fp2", true, 48);

    MvcResult result2 = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login2)))
        .andExpect(status().isOk())
        .andReturn();

    String familyId2 = objectMapper.readTree(result2.getResponse().getContentAsString())
        .get("session").get("tokenFamilyId").asText();

    // Verify different families
    assertThat(familyId1).isNotEqualTo(familyId2);

    RefreshTokenFamily family1 = refreshTokenFamilyRepository.findById(UUID.fromString(familyId1)).get();
    RefreshTokenFamily family2 = refreshTokenFamilyRepository.findById(UUID.fromString(familyId2)).get();

    // Both must have user_id set correctly
    assertThat(family1.getUserId()).isEqualTo(testUser.getId());
    assertThat(family2.getUserId()).isEqualTo(testUser.getId());

    // Must be different families
    assertThat(family1.getFamilyId()).isNotEqualTo(family2.getFamilyId());
  }
}
