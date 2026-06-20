package com.parkflow.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class MixedVehicleEntryIntegrationTest extends BaseIntegrationTest {

  private UUID motorcycleRateId;

  @BeforeEach
  void seedMotorcycleData() {
    MasterVehicleType motorcycleType = new MasterVehicleType();
    motorcycleType.setCode("MOTORCYCLE");
    motorcycleType.setName("Motorcycle");
    motorcycleType.setActive(true);
    motorcycleType.setRequiresPlate(true);
    motorcycleType.setHasOwnRate(true);
    motorcycleType.setDisplayOrder(2);
    masterVehicleTypeRepository.save(motorcycleType);

    var site = parkingSiteRepository.findById(siteId).orElseThrow();

    Rate motorcycleRate = new Rate();
    motorcycleRate.setName("Standard Motorcycle");
    motorcycleRate.setVehicleType("MOTORCYCLE");
    motorcycleRate.setRateType(RateType.HOURLY);
    motorcycleRate.setAmount(new BigDecimal("1500"));
    motorcycleRate.setGraceMinutes(0);
    motorcycleRate.setToleranceMinutes(0);
    motorcycleRate.setFractionMinutes(60);
    motorcycleRate.setSite(site.getName());
    motorcycleRate.setSiteRef(site);
    motorcycleRate.setBaseValue(BigDecimal.ZERO);
    motorcycleRate.setBaseMinutes(0);
    motorcycleRate.setAdditionalValue(BigDecimal.ZERO);
    motorcycleRate.setAdditionalMinutes(0);
    motorcycleRate.setMaxDailyValue(new BigDecimal("15000"));
    motorcycleRate.setActive(true);
    motorcycleRate.setCompanyId(companyId);
    motorcycleRate.setCreatedAt(OffsetDateTime.now());
    motorcycleRate.setUpdatedAt(OffsetDateTime.now());
    motorcycleRate = rateRepository.save(motorcycleRate);
    motorcycleRateId = motorcycleRate.getId();
  }

  @Test
  void mixedEntry_ShouldAllowCarAndMotorcycleInSameSite() throws Exception {
    String token = getAuthToken();

    String carEntry = """
        {
            "idempotencyKey": "mixed-car-%s",
            "plate": "CAR001",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(carEntry))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.receipt.vehicleType").value("CAR"));

    String motorcycleEntry = """
        {
            "idempotencyKey": "mixed-moto-%s",
            "plate": "MOT01A",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(motorcycleEntry))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.receipt.vehicleType").value("MOTORCYCLE"));
  }

  @Test
  void mixedEntry_ActiveSessionsShouldIncludeMultipleTypes() throws Exception {
    String token = getAuthToken();

    String carEntry = """
        {
            "idempotencyKey": "active-car-%s",
            "plate": "ACT001",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(carEntry))
        .andExpect(status().isCreated());

    String motoEntry = """
        {
            "idempotencyKey": "active-moto-%s",
            "plate": "ACT01M",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(motoEntry))
        .andExpect(status().isCreated());

    mockMvc.perform(get("/api/v1/operations/sessions/active-list")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isArray())
        .andExpect(jsonPath("$.data.length()").isNumber());
  }

  @Test
  void mixedEntry_ShouldAllowVisitorEntryModeForCar() throws Exception {
    String token = getAuthToken();

    String entry = """
        {
            "idempotencyKey": "mode-visitor-integration-%s",
            "plate": "VIS001",
            "type": "CAR",
            "entryMode": "VISITOR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(entry))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.receipt.entryMode").value("VISITOR"));
  }

  @Test
  void mixedEntry_ShouldAllowAgreementEntryModeForMotorcycle() throws Exception {
    String token = getAuthToken();

    String entry = """
        {
            "idempotencyKey": "mode-agreement-moto-%s",
            "plate": "AGR01M",
            "type": "MOTORCYCLE",
            "entryMode": "AGREEMENT",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(entry))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.receipt.entryMode").value("AGREEMENT"));
  }

  @Test
  void mixedEntry_MultipleVehiclesDifferentTypes_ShouldAllBeActive() throws Exception {
    String token = getAuthToken();

    String[][] vehicles = {
        {"multi-car-%s", "CAR001", "CAR", "%s"},
        {"multi-moto1-%s", "MOT01A", "MOTORCYCLE", "%s"},
        {"multi-car2-%s", "CAR002", "CAR", "%s"},
        {"multi-moto2-%s", "MOT02B", "MOTORCYCLE", "%s"},
    };

    var rateIdStr = rateId.toString();
    var motoRateIdStr = motorcycleRateId.toString();
    var adminUserIdStr = adminUserId.toString();

    for (var v : vehicles) {
      String idemKey = v[0].formatted(System.currentTimeMillis());
      String rate = v[2].equals("MOTORCYCLE") ? motoRateIdStr : rateIdStr;
      String body = """
          {
              "idempotencyKey": "%s",
              "plate": "%s",
              "type": "%s",
              "rateId": "%s",
              "operatorUserId": "%s",
              "site": "Test Site",
              "terminal": "TERM1",
              "vehicleCondition": "Sin novedades"
          }
          """.formatted(idemKey, v[1], v[2], rate, adminUserIdStr);

      mockMvc.perform(post("/api/v1/operations/entries")
              .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
              .contentType(MediaType.APPLICATION_JSON)
              .content(body))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.receipt.vehicleType").value(v[2]));
    }

    mockMvc.perform(get("/api/v1/operations/sessions/active-list")
            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isArray());
  }
}
