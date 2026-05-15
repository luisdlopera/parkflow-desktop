package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class OperationsIntegrationTest extends BaseIntegrationTest {

    @Test
    void registerEntry_ShouldCreateSession_WhenValidRequest() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "entry-test-001",
                "plate": "ABC123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Ingreso de prueba",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists());
    }

    @Test
    void registerEntry_ShouldReturn400_WhenInvalidPlate() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "plate": "invalid plate",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerEntry_ShouldReturn400_WhenPlateEmptyWithoutSpecialCase() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "empty-plate-%s",
                "plate": "",
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
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
    }

    @Test
    void registerEntry_ShouldCreateSession_WhenNoPlateSpecialCaseHasReason() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "no-plate-%s",
                "type": "CAR",
                "entryMode": "VISITOR",
                "noPlate": true,
                "noPlateReason": "Vehiculo oficial sin placa visible",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        var result = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.receipt.plate").value(org.hamcrest.Matchers.startsWith("SIN-")))
                .andReturn();

        String sessionId = objectMapper.readTree(result.getResponse().getContentAsString()).path("sessionId").asText();
        Integer persisted = jdbcTemplate.queryForObject(
            "select count(*) from parking_session where id = ? and no_plate = true and no_plate_reason is not null",
            Integer.class,
            java.util.UUID.fromString(sessionId));
        org.assertj.core.api.Assertions.assertThat(persisted).isEqualTo(1);
    }

    @Test
    void registerEntry_ShouldPersistAgreementEntryMode() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "agreement-entry-%s",
                "plate": "AGR123",
                "type": "CAR",
                "countryCode": "CO",
                "entryMode": "AGREEMENT",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        var result = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(result.getResponse().getContentAsString()).path("sessionId").asText();
        String entryMode = jdbcTemplate.queryForObject(
            "select entry_mode from parking_session where id = ?",
            String.class,
            java.util.UUID.fromString(sessionId));
        org.assertj.core.api.Assertions.assertThat(entryMode).isEqualTo("AGREEMENT");
    }

    @Test
    void registerEntry_ShouldReturn409_WhenParkingSiteIsFull() throws Exception {
        String token = getAuthToken();
        var site = parkingSiteRepository.findById(siteId).orElseThrow();
        site.setMaxCapacity(1);
        parkingSiteRepository.save(site);

        String baseRequest = """
            {
                "idempotencyKey": "%s",
                "plate": "%s",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """;

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(baseRequest.formatted("capacity-first-" + System.currentTimeMillis(), "CAP101", rateId, adminUserId)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(baseRequest.formatted("capacity-second-" + System.currentTimeMillis(), "CAP102", rateId, adminUserId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
    }

    @Test
    void getActiveSessions_ShouldReturnList() throws Exception {
        String token = getAuthToken();

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void registerExit_ShouldProcessPayment_WhenValidSession() throws Exception {
        // First create entry
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "entry-test-002",
                "plate": "XYZ789",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Salida de prueba",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(rateId, adminUserId);

        var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andReturn();

        String entryResponse = entryResult.getResponse().getContentAsString();
        // Parse ticketNumber
        int start = entryResponse.indexOf("\"ticketNumber\":\"") + 16;
        int end = entryResponse.indexOf("\"", start);
        String ticketNumber = entryResponse.substring(start, end);

        // Now exit
        String exitRequest = String.format("""
            {
                "idempotencyKey": "exit-test-001",
                "ticketNumber": "%s",
                "paymentMethod": "CASH",
                "operatorUserId": "%s",
                "terminal": "TERM1",
                "observations": "Salida de prueba",
                "vehicleCondition": "Sin novedades"
            }
            """, ticketNumber, adminUserId);

        mockMvc.perform(post("/api/v1/operations/exits")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exitRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").exists());
    }

    @Test
    void registerExit_ShouldReturn400_WhenPaymentMissingAndAmountDue() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "exit-nopay-entry-%s",
                "plate": "NOP999",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Salida sin pago API",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andReturn();

        String ticketNumber = objectMapper.readTree(entryResult.getResponse().getContentAsString())
            .path("receipt").path("ticketNumber").asText();

        String exitRequest = """
            {
                "idempotencyKey": "exit-nopay-%s",
                "ticketNumber": "%s",
                "operatorUserId": "%s",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), ticketNumber, adminUserId);

        mockMvc.perform(post("/api/v1/operations/exits")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exitRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
    }

    @Test
    void registerExit_ShouldAllowMissingPayment_WhenOperationalParameterAllows() throws Exception {
        jdbcTemplate.update(
            """
            INSERT INTO operational_parameters
            (id, site_id, allow_entry_without_printer, allow_exit_without_payment, allow_reprint, allow_void,
             require_photo_entry, require_photo_exit, tolerance_minutes, max_time_no_charge, offline_mode_enabled,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            UUID.randomUUID(),
            siteId,
            false,
            true,
            true,
            true,
            false,
            false,
            5,
            15,
            true);

        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "exit-allowwp-entry-%s",
                "plate": "AWP999",
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

        String ticketNumber = objectMapper.readTree(entryResult.getResponse().getContentAsString())
            .path("receipt").path("ticketNumber").asText();

        String exitRequest = """
            {
                "idempotencyKey": "exit-allowwp-%s",
                "ticketNumber": "%s",
                "operatorUserId": "%s",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), ticketNumber, adminUserId);

        mockMvc.perform(post("/api/v1/operations/exits")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exitRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").exists());
    }

    @Test
    void registerExit_ShouldChargeZero_WhenEntryModeAgreement() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "agr-exit-entry-%s",
                "plate": "AGR777",
                "type": "CAR",
                "entryMode": "AGREEMENT",
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

        String ticketNumber = objectMapper.readTree(entryResult.getResponse().getContentAsString())
            .path("receipt").path("ticketNumber").asText();

        String exitRequest = """
            {
                "idempotencyKey": "agr-exit-%s",
                "ticketNumber": "%s",
                "paymentMethod": "CASH",
                "operatorUserId": "%s",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), ticketNumber, adminUserId);

        mockMvc.perform(post("/api/v1/operations/exits")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(exitRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.receipt.entryMode").value("AGREEMENT"));
    }

    @Test
    void registerEntry_ShouldReturn400_WhenIdempotencyKeyMissing() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "plate": "IDM001",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Sin idempotency",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").exists());
    }

    @Test
    void registerEntry_ShouldReturn409_WhenActiveSessionExists() throws Exception {
        String token = getAuthToken();
        String plate = "DUP099";
        String baseRequest = """
            {
                "idempotencyKey": "%s",
                "plate": "%s",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Duplicado",
                "vehicleCondition": "Sin novedades"
            }
            """;

        String firstKey = "dup-first-" + System.currentTimeMillis();
        String firstRequest = baseRequest.formatted(firstKey, plate, rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(firstRequest))
                .andExpect(status().isCreated());

        String secondKey = "dup-second-" + System.currentTimeMillis();
        String secondRequest = baseRequest.formatted(secondKey, plate, rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(secondRequest))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("OPERATION_ERROR"));
    }

    @Test
    void registerEntry_ShouldReturn400_WhenConditionAllEmpty() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "empty-cond-%s",
                "plate": "CON000",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Sin condicion"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void registerEntry_ShouldBeIdempotent_OnRetry() throws Exception {
        String token = getAuthToken();
        String idempotencyKey = "idemp-retry-" + System.currentTimeMillis();
        String entryRequest = """
            {
                "idempotencyKey": "%s",
                "plate": "RET001",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Retry test",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(idempotencyKey, rateId, adminUserId);

        var firstResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists())
                .andReturn();

        String firstSessionId = objectMapper.readTree(firstResult.getResponse().getContentAsString())
            .path("sessionId").asText();

        var secondResult = mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists())
                .andReturn();

        String secondSessionId = objectMapper.readTree(secondResult.getResponse().getContentAsString())
            .path("sessionId").asText();

        org.assertj.core.api.Assertions.assertThat(secondSessionId).isEqualTo(firstSessionId);
    }

    @Test
    void registerEntry_ShouldResolveRate_WhenNoRateId() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "no-rate-id-%s",
                "plate": "NOR000",
                "type": "CAR",
                "operatorUserId": "%s",
                "site": "Test Site",
                "terminal": "TERM1",
                "observations": "Sin rateId",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").exists())
                .andExpect(jsonPath("$.receipt.ticketNumber").exists())
                .andExpect(jsonPath("$.receipt.rateName").exists());
    }

    @Test
    @RepeatedTest(5)
    void concurrentEntries_ShouldHandleConcurrency() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "entry-test-concurrent-%d",
                "plate": "CON%03d",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "terminal": "TERM1",
                "site": "Test Site",
                "observations": "Ingreso concurrente",
                "vehicleCondition": "Sin novedades"
            }
            """;

        mockMvc.perform(post("/api/v1/operations/entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
            .content(entryRequest.formatted(Thread.currentThread().threadId(), Thread.currentThread().threadId(), rateId, adminUserId)))
                .andExpect(status().isCreated());
    }
}
