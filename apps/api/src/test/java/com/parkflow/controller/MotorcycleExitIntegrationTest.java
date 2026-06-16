package com.parkflow.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.configuration.domain.OperationalParameter;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.repository.LockerRepository;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

class MotorcycleExitIntegrationTest extends BaseIntegrationTest {

  @Autowired private ParkingSessionPort parkingSessionPort;
  @Autowired private CustodiedItemPort custodiedItemPort;
  @Autowired private LockerRepository lockerRepository;
  @Autowired private OperationalParameterPort operationalParameterPort;

  private UUID motorcycleRateId;
  private UUID motorcycleSessionId;
  private UUID helmetItemId;
  private UUID lockerId;
  private String ticketNumber;

  @BeforeEach
  void seedMotorcycleData() throws Exception {
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
    motorcycleRate.setLostTicketSurcharge(new BigDecimal("5000"));
    motorcycleRate.setRoundingMode(com.parkflow.modules.configuration.domain.RoundingMode.UP);
    motorcycleRate = rateRepository.save(motorcycleRate);
    motorcycleRateId = motorcycleRate.getId();

    // Create a locker for helmet
    Locker locker = Locker.builder()
        .companyId(companyId)
        .code("L-01")
        .label("Locker 1")
        .status(LockerStatus.DISPONIBLE)
        .isActive(true)
        .build();
    locker = lockerRepository.save(locker);
    lockerId = locker.getId();

    // Create motorcycle entry via API
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "moto-exit-entry-%s",
            "plate": "ABC12D",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "observations": "Ingreso moto para test de salida",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode entryJson = objectMapper.readTree(entryResult.getResponse().getContentAsString());
    motorcycleSessionId = UUID.fromString(entryJson.path("sessionId").asText());
    ticketNumber = entryJson.path("receipt").path("ticketNumber").asText();
    motorcycleSessionId = UUID.fromString(entryJson.path("sessionId").asText());

    // Find the helmet item
    ParkingSession session = parkingSessionPort.findById(motorcycleSessionId).orElseThrow();
    List<CustodiedItem> items = custodiedItemPort.findBySessionAndStatus(session, CustodiedItemStatus.RECEIVED);
    if (!items.isEmpty()) {
      helmetItemId = items.get(0).getId();
    }

    // Open cash session
    openCashSession(token);
  }

  private void openCashSession(String token) throws Exception {
    String cashOpenRequest = """
        {
            "site": "Test Site",
            "terminal": "TERM1",
            "registerLabel": "REG1",
            "openingAmount": 500000,
            "operatorUserId": "%s",
            "openIdempotencyKey": "cash-open-%s"
        }
        """.formatted(adminUserId, System.currentTimeMillis());

    mockMvc.perform(post("/api/v1/cash/open")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(cashOpenRequest))
            .andExpect(status().isCreated());
  }

  // =========================================================================
  // HAPPY PATH - EXIT WITH CASH
  // =========================================================================

  @Test
  void registerMotorcycleExit_ShouldCloseSession_WhenValidRequest() throws Exception {
    String token = getAuthToken();
    String exitRequest = """
        {
            "idempotencyKey": "moto-exit-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "observations": "Salida moto QA",
            "vehicleCondition": "Sin novedades a la salida",
            "conditionChecklist": ["carroceria_ok", "luces_ok", "espejos_ok"],
            "conditionPhotoUrls": ["https://example.test/photos/moto-exit-1.jpg"]
        }
        """.formatted(System.currentTimeMillis(), ticketNumber, adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.status").value("CLOSED"))
            .andExpect(jsonPath("$.receipt.vehicleType").value("MOTORCYCLE"))
            .andExpect(jsonPath("$.total").isNumber())
            .andExpect(jsonPath("$.message").value("Salida registrada"));
  }

  // =========================================================================
  // EXIT WITH HELMET RETURN
  // =========================================================================

  @Test
  void registerMotorcycleExit_WithHelmetReturn_ShouldReleaseLocker() throws Exception {
    String token = getAuthToken();

    // Create entry with helmet
    String entryRequest = """
        {
            "idempotencyKey": "moto-exit-helmet-entry-%s",
            "plate": "HLM12C",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "observations": "Ingreso moto",
            "vehicleCondition": "GOOD",
            "custodiedItems": [{"identifier": "L-01", "observations": "Casco negro"}]
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode entryJson = objectMapper.readTree(entryResult.getResponse().getContentAsString());
    String ticketWithHelmet = entryJson.path("receipt").path("ticketNumber").asText();
    UUID sessionIdWithHelmet = UUID.fromString(entryJson.path("sessionId").asText());

    ParkingSession sessionWithHelmet = parkingSessionPort.findById(sessionIdWithHelmet).orElseThrow();
    List<com.parkflow.modules.parking.operation.domain.CustodiedItem> localItems = custodiedItemPort.findBySessionAndStatus(sessionWithHelmet, com.parkflow.modules.parking.operation.domain.CustodiedItemStatus.RECEIVED);
    UUID localHelmetId = localItems.get(0).getId();

    String exitRequest = """
        {
            "idempotencyKey": "moto-exit-helmet-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "observations": "Salida con devolucion de casco",
            "returnedItemIds": ["%s"],
            "custodiedItemObservations": "Casco devuelto en buen estado"
        }
        """.formatted(System.currentTimeMillis(), ticketWithHelmet, adminUserId, localHelmetId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.status").value("CLOSED"));

    // Verify custodied item status
    ParkingSession session = parkingSessionPort.findById(sessionIdWithHelmet).orElseThrow();
    List<CustodiedItem> items = custodiedItemPort.findBySession(session);
    System.out.println("CustodiedItems for session: " + items);
    boolean helmetReturned = items.stream()
        .anyMatch(i -> i.getStatus() == com.parkflow.modules.parking.operation.domain.CustodiedItemStatus.RETURNED);
    assert helmetReturned : "Helmet should be marked as RETURNED";

    // Verify locker is free
    Locker locker = lockerRepository.findByIdAndCompanyId(lockerId, companyId).orElseThrow();
    assert locker.getStatus() == LockerStatus.DISPONIBLE : "Locker should be DISPONIBLE";
  }

  // =========================================================================
  // EXIT WITHOUT RETURNING HELMET (NO OVERRIDE) - SHOULD FAIL
  // =========================================================================

  @Test
  void registerMotorcycleExit_WithoutReturningHelmet_ShouldFail() throws Exception {
    String token = getAuthToken();
    // Use a new session with helmet without returning
    String entry2Request = """
        {
            "idempotencyKey": "moto-exit-noreturn-entry-%s",
            "plate": "XYZ99Z",
            "type": "MOTORCYCLE",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades",
            "custodiedItems": [{"identifier": "L-02", "observations": "Casco azul"}]
        }
        """.formatted(System.currentTimeMillis(), motorcycleRateId, adminUserId);

    var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entry2Request))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode entryJson = objectMapper.readTree(entryResult.getResponse().getContentAsString());
    String ticket2 = entryJson.path("receipt").path("ticketNumber").asText();

    String exitRequest = """
        {
            "idempotencyKey": "moto-exit-noreturn-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "observations": "Salida sin devolver casco"
        }
        """.formatted(System.currentTimeMillis(), ticket2, adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.userMessage").value(org.hamcrest.Matchers.containsString("elementos pendientes de devolución")));
  }

  // =========================================================================
  // EXIT WITH AGREEMENT DISCOUNT
  // =========================================================================

  @Test
  void registerMotorcycleExit_WithAgreementCode_ShouldApplyDiscount() throws Exception {
    // First create an agreement
    jdbcTemplate.update(
        "INSERT INTO agreement (id, code, company_name, discount_percent, max_hours_per_day, is_active, company_id, created_at, updated_at) "
        + "VALUES (?, 'MOTO10', 'Moto 10%', 10.00, 0, true, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        UUID.randomUUID(), companyId);

    String token = getAuthToken();
    String exitRequest = """
        {
            "idempotencyKey": "moto-exit-agr-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "agreementCode": "MOTO10",
            "observations": "Salida con convenio MOTO10"
        }
        """.formatted(System.currentTimeMillis(), ticketNumber, adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.status").value("CLOSED"))
            .andExpect(jsonPath("$.discount").isNumber());
  }

  // =========================================================================
  // EXIT WITHOUT PAYMENT (ALLOWED VIA PARAM)
  // =========================================================================

  @Test
  void registerExit_WithoutPayment_WhenAllowedByParam_ShouldSucceed() throws Exception {
    // Create a separate non-motorcycle entry for this test
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "exit-nopay-entry-%s",
            "plate": "NOP100",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode entryJson = objectMapper.readTree(entryResult.getResponse().getContentAsString());
    String noPayTicket = entryJson.path("receipt").path("ticketNumber").asText();

    // Set allowExitWithoutPayment on site's operational parameters
    ParkingSite site = parkingSiteRepository.findById(siteId).orElseThrow();
    OperationalParameter param = new OperationalParameter();
    param.setSite(site);
    param.setCompanyId(companyId);
    param.setAllowExitWithoutPayment(true);
    param.setRequirePhotoExit(false);
    operationalParameterPort.save(param);

    String exitRequest = """
        {
            "idempotencyKey": "exit-nopay-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "observations": "Salida sin pago permitida por parametro"
        }
        """.formatted(System.currentTimeMillis(), noPayTicket, adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.status").value("CLOSED"));
  }

  // =========================================================================
  // EXIT WITH PHOTO REQUIREMENT
  // =========================================================================

  @Test
  void registerExit_WithPhotoRequiredAndProvided_ShouldSucceed() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "exit-photo-entry-%s",
            "plate": "PHO100",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode entryJson = objectMapper.readTree(entryResult.getResponse().getContentAsString());
    String photoTicket = entryJson.path("receipt").path("ticketNumber").asText();

    ParkingSite site = parkingSiteRepository.findById(siteId).orElseThrow();
    OperationalParameter param = new OperationalParameter();
    param.setSite(site);
    param.setCompanyId(companyId);
    param.setRequirePhotoExit(true);
    operationalParameterPort.save(param);

    String exitRequest = """
        {
            "idempotencyKey": "exit-photo-ok-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "exitImageUrl": "https://example.test/photos/exit.jpg",
            "observations": "Salida con foto"
        }
        """.formatted(System.currentTimeMillis(), photoTicket, adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.status").value("CLOSED"));
  }

  // =========================================================================
  // EXIT WITH PHOTO REQUIRED BUT MISSING - SHOULD FAIL
  // =========================================================================

  @Test
  void registerExit_WithPhotoRequiredAndMissing_ShouldFail() throws Exception {
    String token = getAuthToken();

    // Create entry for this test
    String entryRequest = """
        {
            "idempotencyKey": "exit-photo-fail-entry-%s",
            "plate": "PHF999",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode entryJson = objectMapper.readTree(entryResult.getResponse().getContentAsString());
    String photoFailTicket = entryJson.path("receipt").path("ticketNumber").asText();

    // Set requirePhotoExit on site's operational parameters
    ParkingSite site = parkingSiteRepository.findById(siteId).orElseThrow();
    OperationalParameter param = new OperationalParameter();
    param.setSite(site);
    param.setCompanyId(companyId);
    param.setRequirePhotoExit(true);
    operationalParameterPort.save(param);

    String exitRequest = """
        {
            "idempotencyKey": "exit-photo-fail-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "observations": "Salida sin foto (deberia fallar)"
        }
        """.formatted(System.currentTimeMillis(), photoFailTicket, adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.userMessage").value(org.hamcrest.Matchers.containsString("foto en salida")));
  }

  // =========================================================================
  // EXIT BY PLATE (NOT TICKET)
  // =========================================================================

  @Test
  void registerExit_ByPlate_ShouldCloseSession() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "exit-plate-entry-%s",
            "plate": "PLT100",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated());

    String exitRequest = """
        {
            "idempotencyKey": "exit-plate-%s",
            "plate": "PLT100",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "observations": "Salida por placa"
        }
        """.formatted(System.currentTimeMillis(), adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.status").value("CLOSED"))
            .andExpect(jsonPath("$.receipt.plate").value("PLT100"));
  }

  // =========================================================================
  // NEGATIVE: EXIT WITHOUT LOCATOR
  // =========================================================================

  @Test
  void registerExit_WithoutLocator_ShouldFail() throws Exception {
    String token = getAuthToken();
    String exitRequest = """
        {
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "observations": "No deberia funcionar"
        }
        """.formatted(adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isBadRequest());
  }

  // =========================================================================
  // NEGATIVE: EXIT FOR NON-EXISTENT SESSION
  // =========================================================================

  @Test
  void registerExit_ForNonExistentSession_ShouldFail() throws Exception {
    String token = getAuthToken();
    String exitRequest = """
        {
            "idempotencyKey": "exit-ghost-%s",
            "ticketNumber": "T-GHOST-999",
            "operatorUserId": "%s",
            "paymentMethod": "CASH"
        }
        """.formatted(System.currentTimeMillis(), adminUserId);

    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isNotFound());
  }

  // =========================================================================
  // LOST TICKET FLOW
  // =========================================================================

  @Test
  void processLostTicket_ShouldMarkSessionLostTicket() throws Exception {
    String token = getAuthToken();
    String entryRequest = """
        {
            "idempotencyKey": "lost-entry-%s",
            "plate": "LST100",
            "type": "CAR",
            "rateId": "%s",
            "operatorUserId": "%s",
            "site": "Test Site",
            "terminal": "TERM1",
            "vehicleCondition": "Sin novedades"
        }
        """.formatted(System.currentTimeMillis(), rateId, adminUserId);

    var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode entryJson = objectMapper.readTree(entryResult.getResponse().getContentAsString());
    String lostTicket = entryJson.path("receipt").path("ticketNumber").asText();

    String lostRequest = """
        {
            "idempotencyKey": "lost-process-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "reason": "Cliente extravio ticket"
        }
        """.formatted(System.currentTimeMillis(), lostTicket, adminUserId);

    mockMvc.perform(post("/api/v1/operations/tickets/lost")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(lostRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.status").value("LOST_TICKET"))
            .andExpect(jsonPath("$.total").isNumber());
  }

  // =========================================================================
  // LOST TICKET - CASHIER FORBIDDEN
  // =========================================================================

  @Test
  void processLostTicket_AsCashier_ShouldFail() throws Exception {
    // Create a cashier user
    UUID cashierId = UUID.randomUUID();
    String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
    jdbcTemplate.update(
        "INSERT INTO app_user (id, name, email, document, phone, site, terminal, role, password_hash, is_active, can_close_cash, can_reprint_tickets, can_void_tickets, require_password_change, company_id, created_at, updated_at) "
        + "VALUES (?, 'Cashier', ?, ?, '3000000001', 'Test Site', 'TERM1', 'CAJERO', 'hash', true, false, false, false, false, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        cashierId, "cashier_" + uniqueSuffix + "@test.com", "DOC_" + uniqueSuffix, companyId);

    String token = getAuthToken();
    String lostRequest = """
        {
            "idempotencyKey": "lost-cashier-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "reason": "Cashier intenta"
        }
        """.formatted(System.currentTimeMillis(), ticketNumber, cashierId);

    mockMvc.perform(post("/api/v1/operations/tickets/lost")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(lostRequest))
            .andExpect(status().isForbidden());
  }

  // =========================================================================
  // REPRINT TICKET
  // =========================================================================

  @Test
  void reprintTicket_ShouldIncrementCounter() throws Exception {
    String token = getAuthToken();
    String reprintRequest = """
        {
            "idempotencyKey": "reprint-%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "reason": "Cliente solicita copia"
        }
        """.formatted(System.currentTimeMillis(), ticketNumber, adminUserId);

    mockMvc.perform(post("/api/v1/operations/tickets/reprint")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(reprintRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.receipt.reprintCount").isNumber());
  }

  // =========================================================================
  // BULK EXIT PRECALCULATE
  // =========================================================================

  @Test
  void bulkExitPrecalculate_ShouldReturnPricingSummary() throws Exception {
    String token = getAuthToken();
    String bulkRequest = """
        {
            "locators": ["%s"],
            "operatorUserId": "%s",
            "paymentMethod": "CASH"
        }
        """.formatted(ticketNumber, adminUserId);

    mockMvc.perform(post("/api/v1/operations/bulk-exits/calculate")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(bulkRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalVehicles").isNumber())
            .andExpect(jsonPath("$.finalTotal").isNumber());
  }

  // =========================================================================
  // IDEMPOTENCY: SAME EXIT KEY REPLAY
  // =========================================================================

  @Test
  void registerExit_WithSameIdempotencyKey_ShouldReplay() throws Exception {
    String token = getAuthToken();
    String idempotencyKey = "idem-exit-" + System.currentTimeMillis();

    String exitRequest = """
        {
            "idempotencyKey": "%s",
            "ticketNumber": "%s",
            "operatorUserId": "%s",
            "paymentMethod": "CASH",
            "observations": "Primera llamada"
        }
        """.formatted(idempotencyKey, ticketNumber, adminUserId);

    // First call
    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk());

    // Second call with same key
    mockMvc.perform(post("/api/v1/operations/exits")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(exitRequest))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("idempotente")));
  }
}
