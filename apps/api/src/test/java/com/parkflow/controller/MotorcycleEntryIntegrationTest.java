package com.parkflow.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class MotorcycleEntryIntegrationTest extends BaseIntegrationTest {

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

    ParkingSite site = parkingSiteRepository.findById(siteId).orElseThrow();

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
  void registerMotorcycleEntry_ShouldCreateSession_WhenValidPlate() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-entry-%s",
            "plate": "ABC12D",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "observations": "Ingreso moto de prueba",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sessionId").exists())
            .andExpect(jsonPath("$.receipt.ticketNumber").exists())
            .andExpect(jsonPath("$.receipt.plate").value("ABC12D"))
            .andExpect(jsonPath("$.receipt.vehicleType").value("MOTORCYCLE"));
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn409_WhenDuplicatePlateInside() throws Exception {
    String token = getAuthToken();
    String plate = "DUP12M";
    String baseRequest = """
        {
            "idempotencyKey": "%s",
            "plate": "%s",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "observations": "Duplicado moto",
            "vehicleCondition": "Sin novedades"
        }
        """;

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(baseRequest.formatted("moto-dup-" + System.currentTimeMillis(), plate, motorcycleRateId, adminUserId)))
            .andExpect(status().isCreated());

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(baseRequest.formatted("moto-dup-2" + System.currentTimeMillis(), plate, motorcycleRateId, adminUserId)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn409_WhenParkingFull() throws Exception {
    String token = getAuthToken();
    ParkingSite site = parkingSiteRepository.findById(siteId).orElseThrow();
    site.setMaxCapacity(1);
    parkingSiteRepository.save(site);

    String baseRequest = """
        {
            "idempotencyKey": "%s",
            "plate": "%s",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "observations": "Cupo moto",
            "vehicleCondition": "Sin novedades"
        }
        """;

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(baseRequest.formatted("moto-cap-" + System.currentTimeMillis(), "CAP12M", motorcycleRateId, adminUserId)))
            .andExpect(status().isCreated());

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(baseRequest.formatted("moto-cap-2" + System.currentTimeMillis(), "CAP13M", motorcycleRateId, adminUserId)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
  }

  @Test
  void registerMotorcycleEntry_ShouldCreateSession_WhenNoPlateWithReason() throws Exception {
    String token = getAuthToken();
    MasterVehicleType motorcycleType = masterVehicleTypeRepository.findByCode("MOTORCYCLE").orElseThrow();
    motorcycleType.setRequiresPlate(false);
    masterVehicleTypeRepository.save(motorcycleType);

    String entryRequest = """
        {
            "idempotencyKey": "moto-no-plate-%s",
            "type": "MOTORCYCLE",
            "entryMode": "VISITOR",
            "noPlate": true,
            "noPlateReason": "Moto sin placa visible",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.receipt.plate").value(org.hamcrest.Matchers.startsWith("SIN-")));
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenInvalidMotorcyclePlate() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-invalid-plate-%s",
            "plate": "ABC123",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenMotorcyclePlateWithCarType() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-cross-plate-%s",
            "plate": "ABC12D",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenCarPlateWithMotorcycleType() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-cross-plate-2-%s",
            "plate": "ABC123",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
  }

  @Test
  void registerMotorcycleEntry_ShouldCreateSession_WhenNormalizedPlateWithSpaces() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-normalize-%s",
            "plate": "ABC 12 D",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.receipt.plate").value("ABC12D"));
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenNoPlateWithoutReason() throws Exception {
    String token = getAuthToken();
    MasterVehicleType motorcycleType = masterVehicleTypeRepository.findByCode("MOTORCYCLE").orElseThrow();
    motorcycleType.setRequiresPlate(false);
    masterVehicleTypeRepository.save(motorcycleType);

    String entryRequest = """
        {
            "idempotencyKey": "moto-no-plate-reason-%s",
            "type": "MOTORCYCLE",
            "noPlate": true,
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest());
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenIdempotencyKeyMissing() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "plate": "IDM12M",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest());
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenVehicleConditionEmpty() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-empty-cond-%s",
            "plate": "CND12M",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": ""
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest());
  }

  @Test
  void registerMotorcycleEntry_ShouldCreateSession_WhenAutoRateResolution() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-auto-rate-%s",
            "plate": "RAT12M",
            "type": "MOTORCYCLE",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.receipt.plate").value("RAT12M"))
            .andExpect(jsonPath("$.receipt.vehicleType").value("MOTORCYCLE"));
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenVehicleTypeDoesNotExist() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-bad-type-%s",
            "plate": "ABC12D",
            "type": "UNKNOWN_VEHICLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest());
  }

  @Test
  void registerMotorcycleEntry_ShouldReturn400_WhenPlateWithSpecialChars() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-special-%s",
            "plate": "AB@12D",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest());
  }

  @Test
  void registerMotorcycleEntry_ShouldReject_WhenPlateExceedsMaxCharacters() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-long-plate-%s",
            "plate": "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isBadRequest());
  }
}
