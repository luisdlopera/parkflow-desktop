package com.parkflow.modules.cash.infrastructure.controller;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.cash.dto.CashSessionOpenRequest;
import com.parkflow.modules.cash.dto.CashSessionCloseRequest;
import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.configuration.domain.CashRegister;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.infrastructure.persistence.CashRegisterRepository;
import com.parkflow.modules.configuration.infrastructure.persistence.ParkingSiteRepository;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.infrastructure.persistence.CompanyJpaRepository;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import java.math.BigDecimal;
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
 * Contract tests for Cash Management endpoints.
 *
 * Verifies critical cash operations:
 * - Cash session opening
 * - Cash session closing with reconciliation
 * - Cash movements (payments, expenses)
 * - Balance validation
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CashSessionContractTest extends BaseIntegrationTest {

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private CompanyJpaRepository companyRepository;
  @Autowired private ParkingSiteRepository parkingSiteRepository;
  @Autowired private CashRegisterRepository cashRegisterRepository;

  private String bearerToken;
  private String testCompanyId;
  private String testSiteId;
  private String testCashRegisterId;

  @BeforeEach
  void setUp() throws Exception {
    // Create test company
    Company company = new Company();
    company.setId(UUID.randomUUID().toString());
    company.setName("Test Company");
    Company savedCompany = companyRepository.save(company);
    testCompanyId = savedCompany.getId();

    // Create test site
    ParkingSite site = new ParkingSite();
    site.setId(UUID.randomUUID().toString());
    site.setCompanyId(testCompanyId);
    site.setName("Test Site");
    ParkingSite savedSite = parkingSiteRepository.save(site);
    testSiteId = savedSite.getId();

    // Create cash register
    CashRegister register = new CashRegister();
    register.setId(UUID.randomUUID().toString());
    register.setCompanyId(testCompanyId);
    register.setCompanySiteId(testSiteId);
    register.setName("Test Register");
    CashRegister savedRegister = cashRegisterRepository.save(register);
    testCashRegisterId = savedRegister.getId();

    // Create test user
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID().toString());
    user.setEmail("cashier@company.com");
    user.setPassword("$2a$10$ygU.secret");
    user.setCompanyId(testCompanyId);
    appUserRepository.save(user);

    // Login to get bearer token
    LoginRequest loginRequest = new LoginRequest();
    loginRequest.setEmail("cashier@company.com");
    loginRequest.setPassword("TestPassword123!");

    MvcResult loginResult =
        mvc.perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andReturn();

    String loginResponse = loginResult.getResponse().getContentAsString();
    bearerToken = objectMapper.readTree(loginResponse).get("accessToken").asText();
  }

  // ========== POST /cash/sessions Tests ==========

  @Test
  void testCashSessionOpen_ValidRequest_Returns201Created() throws Exception {
    CashSessionOpenRequest request = new CashSessionOpenRequest();
    request.setCompanySiteId(testSiteId);
    request.setCashRegisterId(testCashRegisterId);
    request.setOpeningBalance(new BigDecimal("100000"));
    request.setTerminal("CAJA_1");

    mvc.perform(
            post("/api/v1/cash/sessions")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.sessionId", notNullValue()))
        .andExpect(jsonPath("$.companySiteId").value(testSiteId))
        .andExpect(jsonPath("$.cashRegisterId").value(testCashRegisterId))
        .andExpect(jsonPath("$.openingBalance").value(100000))
        .andExpect(jsonPath("$.openedAt", notNullValue()))
        .andExpect(jsonPath("$.status").value("OPEN"));
  }

  @Test
  void testCashSessionOpen_InvalidOpeningBalance_Returns400BadRequest() throws Exception {
    CashSessionOpenRequest request = new CashSessionOpenRequest();
    request.setCompanySiteId(testSiteId);
    request.setCashRegisterId(testCashRegisterId);
    request.setOpeningBalance(new BigDecimal("-100")); // Negative balance
    request.setTerminal("CAJA_1");

    mvc.perform(
            post("/api/v1/cash/sessions")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testCashSessionOpen_UnauthorizedUser_Returns401() throws Exception {
    CashSessionOpenRequest request = new CashSessionOpenRequest();
    request.setCompanySiteId(testSiteId);
    request.setCashRegisterId(testCashRegisterId);
    request.setOpeningBalance(new BigDecimal("100000"));
    request.setTerminal("CAJA_1");

    mvc.perform(
            post("/api/v1/cash/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized());
  }

  // ========== POST /cash/sessions/{id}/close Tests ==========

  @Test
  void testCashSessionClose_ValidRequest_Returns200WithReconciliation() throws Exception {
    // First open a session
    CashSessionOpenRequest openRequest = new CashSessionOpenRequest();
    openRequest.setCompanySiteId(testSiteId);
    openRequest.setCashRegisterId(testCashRegisterId);
    openRequest.setOpeningBalance(new BigDecimal("100000"));
    openRequest.setTerminal("CAJA_1");

    MvcResult openResult =
        mvc.perform(
                post("/api/v1/cash/sessions")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(openRequest)))
            .andExpect(status().isCreated())
            .andReturn();

    String openResponse = openResult.getResponse().getContentAsString();
    String sessionId = objectMapper.readTree(openResponse).get("sessionId").asText();

    // Now close the session
    CashSessionCloseRequest closeRequest = new CashSessionCloseRequest();
    closeRequest.setClosingBalance(new BigDecimal("125000"));
    closeRequest.setNotes("Session closed at end of day");

    mvc.perform(
            post("/api/v1/cash/sessions/" + sessionId + "/close")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(closeRequest)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessionId").value(sessionId))
        .andExpect(jsonPath("$.openingBalance").value(100000))
        .andExpect(jsonPath("$.closingBalance").value(125000))
        .andExpect(jsonPath("$.openedAt", notNullValue()))
        .andExpect(jsonPath("$.closedAt", notNullValue()))
        .andExpect(jsonPath("$.status").value("CLOSED"))
        .andExpect(jsonPath("$.reconciliationStatus").value("BALANCED"));
  }

  @Test
  void testCashSessionClose_InvalidSessionId_Returns404NotFound() throws Exception {
    CashSessionCloseRequest request = new CashSessionCloseRequest();
    request.setClosingBalance(new BigDecimal("125000"));
    request.setNotes("Test");

    mvc.perform(
            post("/api/v1/cash/sessions/" + UUID.randomUUID() + "/close")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
  }

  @Test
  void testCashSessionClose_NegativeClosingBalance_Returns400BadRequest() throws Exception {
    // First open a session
    CashSessionOpenRequest openRequest = new CashSessionOpenRequest();
    openRequest.setCompanySiteId(testSiteId);
    openRequest.setCashRegisterId(testCashRegisterId);
    openRequest.setOpeningBalance(new BigDecimal("100000"));
    openRequest.setTerminal("CAJA_1");

    MvcResult openResult =
        mvc.perform(
                post("/api/v1/cash/sessions")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(openRequest)))
            .andExpect(status().isCreated())
            .andReturn();

    String openResponse = openResult.getResponse().getContentAsString();
    String sessionId = objectMapper.readTree(openResponse).get("sessionId").asText();

    // Try to close with negative balance
    CashSessionCloseRequest closeRequest = new CashSessionCloseRequest();
    closeRequest.setClosingBalance(new BigDecimal("-1000")); // Negative
    closeRequest.setNotes("Invalid close");

    mvc.perform(
            post("/api/v1/cash/sessions/" + sessionId + "/close")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(closeRequest)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  // ========== POST /cash/sessions/{id}/movements Tests ==========

  @Test
  void testCashMovement_RecordPayment_Returns201Created() throws Exception {
    // First open a session
    CashSessionOpenRequest openRequest = new CashSessionOpenRequest();
    openRequest.setCompanySiteId(testSiteId);
    openRequest.setCashRegisterId(testCashRegisterId);
    openRequest.setOpeningBalance(new BigDecimal("100000"));
    openRequest.setTerminal("CAJA_1");

    MvcResult openResult =
        mvc.perform(
                post("/api/v1/cash/sessions")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(openRequest)))
            .andExpect(status().isCreated())
            .andReturn();

    String openResponse = openResult.getResponse().getContentAsString();
    String sessionId = objectMapper.readTree(openResponse).get("sessionId").asText();

    // Record a movement
    CashMovementRequest movementRequest = new CashMovementRequest();
    movementRequest.setType("PAYMENT");
    movementRequest.setAmount(new BigDecimal("5000"));
    movementRequest.setCurrency("COP");
    movementRequest.setDescription("Payment from parking session");
    movementRequest.setReferenceId("session-abc-123");

    mvc.perform(
            post("/api/v1/cash/sessions/" + sessionId + "/movements")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(movementRequest)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.movementId", notNullValue()))
        .andExpect(jsonPath("$.sessionId").value(sessionId))
        .andExpect(jsonPath("$.type").value("PAYMENT"))
        .andExpect(jsonPath("$.amount").value(5000))
        .andExpect(jsonPath("$.currency").value("COP"))
        .andExpect(jsonPath("$.recordedAt", notNullValue()))
        .andExpect(jsonPath("$.status").value("RECORDED"));
  }

  @Test
  void testCashMovement_InvalidAmount_Returns400BadRequest() throws Exception {
    // First open a session
    CashSessionOpenRequest openRequest = new CashSessionOpenRequest();
    openRequest.setCompanySiteId(testSiteId);
    openRequest.setCashRegisterId(testCashRegisterId);
    openRequest.setOpeningBalance(new BigDecimal("100000"));
    openRequest.setTerminal("CAJA_1");

    MvcResult openResult =
        mvc.perform(
                post("/api/v1/cash/sessions")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(openRequest)))
            .andExpect(status().isCreated())
            .andReturn();

    String openResponse = openResult.getResponse().getContentAsString();
    String sessionId = objectMapper.readTree(openResponse).get("sessionId").asText();

    // Record movement with invalid amount
    CashMovementRequest movementRequest = new CashMovementRequest();
    movementRequest.setType("PAYMENT");
    movementRequest.setAmount(new BigDecimal("-5000")); // Negative
    movementRequest.setCurrency("COP");

    mvc.perform(
            post("/api/v1/cash/sessions/" + sessionId + "/movements")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(movementRequest)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testCashMovement_ClosedSession_Returns409Conflict() throws Exception {
    // Open and close a session
    CashSessionOpenRequest openRequest = new CashSessionOpenRequest();
    openRequest.setCompanySiteId(testSiteId);
    openRequest.setCashRegisterId(testCashRegisterId);
    openRequest.setOpeningBalance(new BigDecimal("100000"));
    openRequest.setTerminal("CAJA_1");

    MvcResult openResult =
        mvc.perform(
                post("/api/v1/cash/sessions")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(openRequest)))
            .andExpect(status().isCreated())
            .andReturn();

    String openResponse = openResult.getResponse().getContentAsString();
    String sessionId = objectMapper.readTree(openResponse).get("sessionId").asText();

    // Close the session
    CashSessionCloseRequest closeRequest = new CashSessionCloseRequest();
    closeRequest.setClosingBalance(new BigDecimal("100000"));
    closeRequest.setNotes("Closed");

    mvc.perform(
            post("/api/v1/cash/sessions/" + sessionId + "/close")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(closeRequest)))
        .andExpect(status().isOk());

    // Try to record movement on closed session
    CashMovementRequest movementRequest = new CashMovementRequest();
    movementRequest.setType("PAYMENT");
    movementRequest.setAmount(new BigDecimal("5000"));
    movementRequest.setCurrency("COP");

    mvc.perform(
            post("/api/v1/cash/sessions/" + sessionId + "/movements")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(movementRequest)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error.code").value("CONFLICT"));
  }
}
