package com.parkflow.modules.reports.controller;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.infrastructure.persistence.ParkingSiteRepository;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import java.time.LocalDate;
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
 * Contract tests for Report endpoints.
 *
 * Verifies report functionality:
 * - Daily parking report generation
 * - Revenue summary reports
 * - Permission enforcement
 * - Data aggregation accuracy
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportContractTest extends BaseIntegrationTest {

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private AppUserRepository appUserRepository;
  @Autowired private CompanyPort companyRepository;
  @Autowired private ParkingSiteRepository parkingSiteRepository;

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
    user.setEmail("reporter@company.com");
    user.setPassword("$2a$10$ygU.secret");
    user.setCompanyId(testCompanyId);
    appUserRepository.save(user);

    // Login to get bearer token
    LoginRequest loginRequest = new LoginRequest();
    loginRequest.setEmail("reporter@company.com");
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

  // ========== GET /reports/daily Tests ==========

  @Test
  void testDailyReport_ValidDate_Returns200WithReportData() throws Exception {
    LocalDate today = LocalDate.now();

    mvc.perform(
            get("/api/v1/reports/daily")
                .header("Authorization", "Bearer " + bearerToken)
                .param("date", today.toString())
                .param("companySiteId", testSiteId))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.date", notNullValue()))
        .andExpect(jsonPath("$.companySiteId").value(testSiteId))
        .andExpect(jsonPath("$.summary", notNullValue()))
        .andExpect(jsonPath("$.summary.totalSessions").isNumber())
        .andExpect(jsonPath("$.summary.totalRevenue").isNumber())
        .andExpect(jsonPath("$.summary.currency").value("COP"))
        .andExpect(jsonPath("$.summary.averageStay").isNumber())
        .andExpect(jsonPath("$.byVehicleType", notNullValue()))
        .andExpect(jsonPath("$.byHour", notNullValue()));
  }

  @Test
  void testDailyReport_InvalidDateFormat_Returns400BadRequest() throws Exception {
    mvc.perform(
            get("/api/v1/reports/daily")
                .header("Authorization", "Bearer " + bearerToken)
                .param("date", "invalid-date")
                .param("companySiteId", testSiteId))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testDailyReport_MissingDate_Returns400BadRequest() throws Exception {
    mvc.perform(
            get("/api/v1/reports/daily")
                .header("Authorization", "Bearer " + bearerToken)
                .param("companySiteId", testSiteId))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testDailyReport_UnauthorizedUser_Returns401() throws Exception {
    LocalDate today = LocalDate.now();

    mvc.perform(
            get("/api/v1/reports/daily")
                .param("date", today.toString())
                .param("companySiteId", testSiteId))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void testDailyReport_FutureDate_Returns400BadRequest() throws Exception {
    LocalDate futureDate = LocalDate.now().plusDays(1);

    mvc.perform(
            get("/api/v1/reports/daily")
                .header("Authorization", "Bearer " + bearerToken)
                .param("date", futureDate.toString())
                .param("companySiteId", testSiteId))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  // ========== GET /reports/revenue Tests ==========

  @Test
  void testRevenueReport_ValidDateRange_Returns200WithRevenueData() throws Exception {
    LocalDate startDate = LocalDate.now().minusDays(7);
    LocalDate endDate = LocalDate.now();

    mvc.perform(
            get("/api/v1/reports/revenue")
                .header("Authorization", "Bearer " + bearerToken)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString())
                .param("companySiteId", testSiteId)
                .param("groupBy", "day"))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.startDate").value(startDate.toString()))
        .andExpect(jsonPath("$.endDate").value(endDate.toString()))
        .andExpect(jsonPath("$.companySiteId").value(testSiteId))
        .andExpect(jsonPath("$.groupBy").value("day"))
        .andExpect(jsonPath("$.data", notNullValue()))
        .andExpect(jsonPath("$.totals", notNullValue()))
        .andExpect(jsonPath("$.totals.totalRevenue").isNumber())
        .andExpect(jsonPath("$.totals.totalSessions").isNumber())
        .andExpect(jsonPath("$.totals.averageSessionValue").isNumber());
  }

  @Test
  void testRevenueReport_InvalidDateFormat_Returns400BadRequest() throws Exception {
    mvc.perform(
            get("/api/v1/reports/revenue")
                .header("Authorization", "Bearer " + bearerToken)
                .param("startDate", "invalid")
                .param("endDate", LocalDate.now().toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testRevenueReport_MissingStartDate_Returns400BadRequest() throws Exception {
    mvc.perform(
            get("/api/v1/reports/revenue")
                .header("Authorization", "Bearer " + bearerToken)
                .param("endDate", LocalDate.now().toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testRevenueReport_StartAfterEnd_Returns400BadRequest() throws Exception {
    LocalDate startDate = LocalDate.now();
    LocalDate endDate = LocalDate.now().minusDays(7);

    mvc.perform(
            get("/api/v1/reports/revenue")
                .header("Authorization", "Bearer " + bearerToken)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
  }

  @Test
  void testRevenueReport_WithMonthlyGrouping_Returns200() throws Exception {
    LocalDate startDate = LocalDate.now().minusMonths(3);
    LocalDate endDate = LocalDate.now();

    mvc.perform(
            get("/api/v1/reports/revenue")
                .header("Authorization", "Bearer " + bearerToken)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString())
                .param("groupBy", "month"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groupBy").value("month"))
        .andExpect(jsonPath("$.data", notNullValue()));
  }

  @Test
  void testRevenueReport_UnauthorizedUser_Returns401() throws Exception {
    LocalDate startDate = LocalDate.now().minusDays(7);
    LocalDate endDate = LocalDate.now();

    mvc.perform(
            get("/api/v1/reports/revenue")
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void testRevenueReport_UserFromDifferentCompany_Returns403Forbidden() throws Exception {
    // Create another company
    Company otherCompany = new Company();
    otherCompany.setId(UUID.randomUUID().toString());
    otherCompany.setName("Other Company");
    companyRepository.save(otherCompany);

    // Create site for other company
    ParkingSite otherSite = new ParkingSite();
    otherSite.setId(UUID.randomUUID().toString());
    otherSite.setCompanyId(otherCompany.getId());
    otherSite.setName("Other Site");
    parkingSiteRepository.save(otherSite);

    LocalDate startDate = LocalDate.now().minusDays(7);
    LocalDate endDate = LocalDate.now();

    mvc.perform(
            get("/api/v1/reports/revenue")
                .header("Authorization", "Bearer " + bearerToken)
                .param("startDate", startDate.toString())
                .param("endDate", endDate.toString())
                .param("companySiteId", otherSite.getId()))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
  }

  // ========== Data Aggregation Tests ==========

  @Test
  void testDailyReport_IncludesAllSessions() throws Exception {
    // Create multiple sessions
    for (int i = 0; i < 3; i++) {
      EntryRequest entryRequest = new EntryRequest();
      entryRequest.setLicensePlate("TEST-000" + i);
      entryRequest.setVehicleType("sedan");
      entryRequest.setCompanySiteId(testSiteId);

      mvc.perform(
              post("/api/v1/parking/operations/entry")
                  .header("Authorization", "Bearer " + bearerToken)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(entryRequest)))
          .andExpect(status().isCreated());
    }

    LocalDate today = LocalDate.now();

    mvc.perform(
            get("/api/v1/reports/daily")
                .header("Authorization", "Bearer " + bearerToken)
                .param("date", today.toString())
                .param("companySiteId", testSiteId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.totalSessions").value(3));
  }
}
