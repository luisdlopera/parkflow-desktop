package com.parkflow.modules.parking.operation.controller;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.common.dto.EntryRequest;
import com.parkflow.modules.common.dto.ExitRequest;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.infrastructure.persistence.ParkingSiteRepository;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.infrastructure.persistence.CompanyJpaRepository;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import java.time.Instant;
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
 * Contract tests for Parking Operation endpoints.
 *
 * Verifies critical parking operations:
 * - Vehicle entry recording
 * - Vehicle exit and charge calculation
 * - Session management
 * - Authorization and validation
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ParkingOperationContractTest extends BaseIntegrationTest {

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private CompanyJpaRepository companyRepository;
  @Autowired private ParkingSiteRepository parkingSiteRepository;
  @Autowired private ParkingSessionRepository parkingSessionRepository;

  private String bearerToken;
  private String testCompanyId;
  private String testSiteId;

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

    // Create test user
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID().toString());
    user.setEmail("operator@company.com");
    user.setPassword(
        "$2a$10$ygU" + ".secret"); // bcrypt hash (use real hash in production)
    user.setCompanyId(testCompanyId);
    appUserRepository.save(user);

    // Login to get bearer token
    LoginRequest loginRequest = new LoginRequest();
    loginRequest.setEmail("operator@company.com");
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

  // ========== POST /parking/operations/entry Tests ==========

  @Test
  void testParkingEntry_ValidRequest_Returns201Created() throws Exception {
    EntryRequest request = new EntryRequest();
    request.setLicensePlate("ABC-1234");
    request.setVehicleType("sedan");
    request.setCompanySiteId(testSiteId);
    request.setEntryTerminal("ENTRADA_NORTE");

    mvc.perform(
            post("/api/v1/parking/operations/entry")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.sessionId", notNullValue()))
        .andExpect(jsonPath("$.licensePlate").value("ABC-1234"))
        .andExpect(jsonPath("$.vehicleType").value("sedan"))
        .andExpect(jsonPath("$.entryTime", notNullValue()))
        .andExpect(jsonPath("$.status").value("ACTIVE"));
  }

  @Test
  void testParkingEntry_InvalidLicensePlate_Returns400BadRequest() throws Exception {
    EntryRequest request = new EntryRequest();
    request.setLicensePlate(""); // Empty plate
    request.setVehicleType("sedan");
    request.setCompanySiteId(testSiteId);

    mvc.perform(
            post("/api/v1/parking/operations/entry")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testParkingEntry_DuplicateVehicle_Returns409Conflict() throws Exception {
    // First entry
    EntryRequest firstEntry = new EntryRequest();
    firstEntry.setLicensePlate("ABC-1234");
    firstEntry.setVehicleType("sedan");
    firstEntry.setCompanySiteId(testSiteId);

    mvc.perform(
            post("/api/v1/parking/operations/entry")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(firstEntry)))
        .andExpect(status().isCreated());

    // Second entry with same plate
    mvc.perform(
            post("/api/v1/parking/operations/entry")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(firstEntry)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error.code").value("CONFLICT"));
  }

  @Test
  void testParkingEntry_UnauthorizedUser_Returns401() throws Exception {
    EntryRequest request = new EntryRequest();
    request.setLicensePlate("ABC-1234");
    request.setVehicleType("sedan");
    request.setCompanySiteId(testSiteId);

    mvc.perform(
            post("/api/v1/parking/operations/entry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized());
  }

  // ========== POST /parking/operations/exit Tests ==========

  @Test
  void testParkingExit_ValidRequest_Returns200WithChargeCalculation() throws Exception {
    // First, create a session
    EntryRequest entryRequest = new EntryRequest();
    entryRequest.setLicensePlate("ABC-5678");
    entryRequest.setVehicleType("sedan");
    entryRequest.setCompanySiteId(testSiteId);
    entryRequest.setEntryTerminal("ENTRADA_NORTE");

    MvcResult entryResult =
        mvc.perform(
                post("/api/v1/parking/operations/entry")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(entryRequest)))
            .andExpect(status().isCreated())
            .andReturn();

    String entryResponse = entryResult.getResponse().getContentAsString();
    String sessionId = objectMapper.readTree(entryResponse).get("sessionId").asText();

    // Now exit
    ExitRequest exitRequest = new ExitRequest();
    exitRequest.setSessionId(sessionId);
    exitRequest.setExitTerminal("SALIDA_NORTE");
    exitRequest.setPaymentMethod("cash");

    mvc.perform(
            post("/api/v1/parking/operations/exit")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(exitRequest)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessionId").value(sessionId))
        .andExpect(jsonPath("$.licensePlate").value("ABC-5678"))
        .andExpect(jsonPath("$.entryTime", notNullValue()))
        .andExpect(jsonPath("$.exitTime", notNullValue()))
        .andExpect(jsonPath("$.durationMinutes").isNumber())
        .andExpect(jsonPath("$.amountCharged").isNumber())
        .andExpect(jsonPath("$.currency").value("COP"))
        .andExpect(jsonPath("$.paymentMethod").value("cash"))
        .andExpect(jsonPath("$.status").value("CLOSED"));
  }

  @Test
  void testParkingExit_InvalidSessionId_Returns404NotFound() throws Exception {
    ExitRequest request = new ExitRequest();
    request.setSessionId(UUID.randomUUID().toString());
    request.setExitTerminal("SALIDA_NORTE");
    request.setPaymentMethod("cash");

    mvc.perform(
            post("/api/v1/parking/operations/exit")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
  }

  @Test
  void testParkingExit_AlreadyClosed_Returns409Conflict() throws Exception {
    // Create and close a session
    EntryRequest entryRequest = new EntryRequest();
    entryRequest.setLicensePlate("ABC-9999");
    entryRequest.setVehicleType("sedan");
    entryRequest.setCompanySiteId(testSiteId);

    MvcResult entryResult =
        mvc.perform(
                post("/api/v1/parking/operations/entry")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(entryRequest)))
            .andExpect(status().isCreated())
            .andReturn();

    String entryResponse = entryResult.getResponse().getContentAsString();
    String sessionId = objectMapper.readTree(entryResponse).get("sessionId").asText();

    // First exit
    ExitRequest exitRequest = new ExitRequest();
    exitRequest.setSessionId(sessionId);
    exitRequest.setExitTerminal("SALIDA_NORTE");
    exitRequest.setPaymentMethod("cash");

    mvc.perform(
            post("/api/v1/parking/operations/exit")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(exitRequest)))
        .andExpect(status().isOk());

    // Second exit attempt should fail
    mvc.perform(
            post("/api/v1/parking/operations/exit")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(exitRequest)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error.code").value("CONFLICT"));
  }

  // ========== GET /parking/sessions/current Tests ==========

  @Test
  void testGetCurrentSessions_Returns200WithActiveSessions() throws Exception {
    // Create a session
    EntryRequest entryRequest = new EntryRequest();
    entryRequest.setLicensePlate("ABC-CURRENT");
    entryRequest.setVehicleType("sedan");
    entryRequest.setCompanySiteId(testSiteId);

    mvc.perform(
            post("/api/v1/parking/operations/entry")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(entryRequest)))
        .andExpect(status().isCreated());

    // Get current sessions
    mvc.perform(
            get("/api/v1/parking/sessions/current")
                .header("Authorization", "Bearer " + bearerToken)
                .param("companySiteId", testSiteId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data", notNullValue()))
        .andExpect(jsonPath("$.data[0].licensePlate").value("ABC-CURRENT"))
        .andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
        .andExpect(jsonPath("$.pagination.total").isNumber());
  }

  @Test
  void testGetCurrentSessions_UnauthorizedUser_Returns401() throws Exception {
    mvc.perform(get("/api/v1/parking/sessions/current"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void testGetCurrentSessions_WithPagination_Returns200() throws Exception {
    mvc.perform(
            get("/api/v1/parking/sessions/current")
                .header("Authorization", "Bearer " + bearerToken)
                .param("companySiteId", testSiteId)
                .param("limit", "50")
                .param("offset", "0"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pagination.limit").value(50))
        .andExpect(jsonPath("$.pagination.offset").value(0));
  }
}
