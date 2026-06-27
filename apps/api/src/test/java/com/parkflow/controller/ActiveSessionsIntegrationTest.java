package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ActiveSessionsIntegrationTest extends BaseIntegrationTest {

    @Test
    void getActiveSessions_ShouldReturnEmptyList_WhenNoSessionsExist() throws Exception {
        String token = getAuthToken();

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.meta.total").value(0));
    }

    @Test
    void getActiveSessions_ShouldReturnCreatedSessions() throws Exception {
        String token = getAuthToken();

        String entryRequest = """
            {
                "idempotencyKey": "active-sessions-test-%s",
                "plate": "ACT123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].plate").value("ACT123"));
    }

    @Test
    void getActiveSessions_ShouldFilterBySearchTerm() throws Exception {
        String token = getAuthToken();

        String entryRequest1 = """
            {
                "idempotencyKey": "search-test-1-%s",
                "plate": "SRH123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        String entryRequest2 = """
            {
                "idempotencyKey": "search-test-2-%s",
                "plate": "OTH123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest1))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest2))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("search", "SRH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].plate").value("SRH123"));
    }

    @Test
    void getActiveSessions_ShouldSupportPagination() throws Exception {
        String token = getAuthToken();

        for (int i = 1; i <= 5; i++) {
            String entryRequest = """
                {
                    "idempotencyKey": "pagination-test-%d-%s",
                    "plate": "PGE%03d",
                    "type": "CAR",
                    "rateId": "%s",
                    "operatorUserId": "%s",
                    "site": "DEFAULT",
                    "terminal": "TERM1",
                    "vehicleCondition": "Sin novedades"
                }
                """.formatted(i, System.currentTimeMillis(), i, rateId, adminUserId);

            mockMvc.perform(post("/api/v1/operations/entries")
                    .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(entryRequest))
                    .andExpect(status().isCreated());
        }

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("page", "1")
                .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.meta.page").value(1))
                .andExpect(jsonPath("$.meta.limit").value(2))
                .andExpect(jsonPath("$.meta.total").value(5))
                .andExpect(jsonPath("$.meta.totalPages").value(3));

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("page", "2")
                .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.meta.page").value(2));
    }

    @Test
    void getActiveSessions_ShouldSupportSorting() throws Exception {
        String token = getAuthToken();

        for (int i = 1; i <= 3; i++) {
            String entryRequest = """
                {
                    "idempotencyKey": "sort-test-%d-%s",
                    "plate": "SRT%03d",
                    "type": "CAR",
                    "rateId": "%s",
                    "operatorUserId": "%s",
                    "site": "DEFAULT",
                    "terminal": "TERM1",
                    "vehicleCondition": "Sin novedades"
                }
                """.formatted(i, System.currentTimeMillis(), i, rateId, adminUserId);

            mockMvc.perform(post("/api/v1/operations/entries")
                    .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(entryRequest))
                    .andExpect(status().isCreated());
        }

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("sortBy", "plate")
                .param("sortDir", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getActiveSessions_ShouldNotIncludeClosedSessions() throws Exception {
        String token = getAuthToken();

        String entryRequest = """
            {
                "idempotencyKey": "closed-session-test-%s",
                "plate": "CLO123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        var entryResult = mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andReturn();

        String entryResponse = entryResult.getResponse().getContentAsString();
        int start = entryResponse.indexOf("\"ticketNumber\":\"") + 16;
        int end = entryResponse.indexOf("\"", start);
        String ticketNumber = entryResponse.substring(start, end);

        String cashOpenRequest = """
            {
                "site": "DEFAULT",
                "terminal": "TERM1",
                "registerLabel": "REG1",
                "openingAmount": 500000,
                "operatorUserId": "%s",
                "openIdempotencyKey": "cash-open-%s"
            }
            """.formatted(adminUserId, System.currentTimeMillis());

        mockMvc.perform(post("/api/v1/cash/open")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cashOpenRequest))
                .andExpect(status().isCreated());

        String exitRequest = """
            {
                "idempotencyKey": "exit-closed-%s",
                "ticketNumber": "%s",
                "paymentMethod": "CASH",
                "operatorUserId": "%s",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), ticketNumber, adminUserId);

        mockMvc.perform(post("/api/v1/operations/exits")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(exitRequest))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("search", "CLO123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void getActiveSessions_ShouldHandleSpecialCharactersInSearch() throws Exception {
        String token = getAuthToken();

        String entryRequest = """
            {
                "idempotencyKey": "special-char-test-%s",
                "plate": "ABC-123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("search", "ABC-"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getActiveSessions_ShouldReturnMotorcycleSessions() throws Exception {
        String token = getAuthToken();

        com.parkflow.modules.settings.domain.MasterVehicleType motorcycleType = new com.parkflow.modules.settings.domain.MasterVehicleType();
        motorcycleType.setCode("MOTORCYCLE");
        motorcycleType.setName("Motorcycle");
        motorcycleType.setActive(true);
        motorcycleType.setRequiresPlate(true);
        motorcycleType.setHasOwnRate(true);
        motorcycleType.setDisplayOrder(2);
        masterVehicleTypeRepository.save(motorcycleType);

        String entryRequest = """
            {
                "idempotencyKey": "moto-active-test-%s",
                "plate": "MOT12C",
                "type": "MOTORCYCLE",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("search", "MOT12C"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].vehicleType").value("MOTORCYCLE"));
    }

    @Test
    void getActiveSessions_ShouldReturnProperReceiptStructure() throws Exception {
        String token = getAuthToken();

        String entryRequest = """
            {
                "idempotencyKey": "receipt-structure-test-%s",
                "plate": "REC123",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "observations": "Test observations",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(System.currentTimeMillis(), rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("search", "REC123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].ticketNumber").exists())
                .andExpect(jsonPath("$.data[0].plate").value("REC123"))
                .andExpect(jsonPath("$.data[0].vehicleType").value("CAR"))
                .andExpect(jsonPath("$.data[0].duration").exists())
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"));
    }

    @Test
    void getActiveSessions_ShouldHandleLargePageNumbers() throws Exception {
        String token = getAuthToken();

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("page", "999")
                .param("limit", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.meta.page").value(999));
    }

    @Test
    void getActiveSessions_ShouldHandleZeroLimit() throws Exception {
        String token = getAuthToken();

        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .param("page", "1")
                .param("limit", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getActiveSessions_ShouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/operations/sessions/active-list"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getActiveSessions_ShouldRejectInvalidToken() throws Exception {
        mockMvc.perform(get("/api/v1/operations/sessions/active-list")
                .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }
}