package com.parkflow.controller;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ParkingSpaceIntegrationTest extends BaseIntegrationTest {

    @Test
    void registerEntry_ShouldAssignParkingSpace_WhenAvailable() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "space-test-001",
                "plate": "SPA111",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.receipt.parkingSpaceCode").value("C001"));
    }

    @Test
    void registerEntry_ShouldFailWithParkingFull_WhenNoSpacesAvailable() throws Exception {
        String token = getAuthToken();
        
        // Clear default seeded spaces to force PARKING_FULL
        jdbcTemplate.execute("DELETE FROM parking_space_assignment");
        jdbcTemplate.execute("DELETE FROM parking_space");

        String entryRequest = """
            {
                "idempotencyKey": "space-test-full",
                "plate": "SPA222",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(rateId, adminUserId);

        mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("PARKING_FULL"));
    }

    @Test
    void registerExit_ShouldReleaseSpace() throws Exception {
        String token = getAuthToken();
        String entryRequest = """
            {
                "idempotencyKey": "space-test-exit",
                "plate": "SPA333",
                "type": "CAR",
                "rateId": "%s",
                "operatorUserId": "%s",
                "site": "DEFAULT",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(rateId, adminUserId);

        var result = mockMvc.perform(post("/api/v1/operations/entries")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(entryRequest))
                .andExpect(status().isCreated())
                .andReturn();

        String ticketNumber = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("receipt").path("ticketNumber").asText();

        // Verify space is occupied in database
        Boolean occupiedBefore = jdbcTemplate.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM parking_space_assignment WHERE released_at IS NULL)", Boolean.class);
        assertThat(occupiedBefore).isTrue();

        // Exit
        String exitRequest = """
            {
                "idempotencyKey": "space-test-exit-action",
                "ticketNumber": "%s",
                "paymentMethod": "CASH",
                "operatorUserId": "%s",
                "terminal": "TERM1",
                "vehicleCondition": "Sin novedades"
            }
            """.formatted(ticketNumber, adminUserId);

        mockMvc.perform(post("/api/v1/operations/exits")
                .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(exitRequest))
                .andExpect(status().isOk());

        // Verify space is released
        Boolean occupiedAfter = jdbcTemplate.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM parking_space_assignment WHERE released_at IS NULL)", Boolean.class);
        assertThat(occupiedAfter).isFalse();
    }

    @Test
    @org.junit.jupiter.api.Disabled("Requires PostgreSQL (FOR UPDATE SKIP LOCKED) - H2 does not support concurrent lock semantics")
    void concurrentEntries_ShouldNotAssignSameSpace() throws Exception {
        String token = getAuthToken();

        // Let's ensure only 2 active spaces are available in database
        jdbcTemplate.execute("DELETE FROM parking_space_assignment");
        jdbcTemplate.execute("DELETE FROM parking_space");
        jdbcTemplate.execute("INSERT INTO parking_space (id, company_id, code, type, status, sort_order, created_at, updated_at) VALUES " +
                "(random_uuid(), '" + companyId + "', 'CS01', 'GENERAL', 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), " +
                "(random_uuid(), '" + companyId + "', 'CS02', 'GENERAL', 'ACTIVE', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    String req = """
                        {
                            "idempotencyKey": "concurrent-space-%d",
                            "plate": "CONC%02d",
                            "type": "CAR",
                            "rateId": "%s",
                            "operatorUserId": "%s",
                            "site": "DEFAULT",
                            "terminal": "TERM1",
                            "vehicleCondition": "Sin novedades"
                        }
                        """.formatted(index, index, rateId, adminUserId);

                    int status = mockMvc.perform(post("/api/v1/operations/entries")
                            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(req))
                            .andReturn().getResponse().getStatus();

                    if (status == 201) {
                        successCount.incrementAndGet();
                    } else if (status == 409) {
                        conflictCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    done.countDown();
                }
            });
        }

        latch.countDown(); // trigger parallel execution
        done.await();
        executor.shutdown();

        // Since we have 2 spaces and 2 requests, both should succeed and get different spaces
        assertThat(successCount.get()).isEqualTo(2);
        
        // Verify both CS01 and CS02 are occupied
        long activeAssignmentsCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM parking_space_assignment WHERE released_at IS NULL", Long.class);
        assertThat(activeAssignmentsCount).isEqualTo(2);
    }

    @Test
    @org.junit.jupiter.api.Disabled("Requires PostgreSQL (FOR UPDATE SKIP LOCKED) - H2 does not support concurrent lock semantics")
    void concurrentEntries_OnlyOneSucceeds_WhenOnlyOneSpaceLeft() throws Exception {
        String token = getAuthToken();

        // Let's ensure only 1 active space is available in database
        jdbcTemplate.execute("DELETE FROM parking_space_assignment");
        jdbcTemplate.execute("DELETE FROM parking_space");
        jdbcTemplate.execute("INSERT INTO parking_space (id, company_id, code, type, status, sort_order, created_at, updated_at) VALUES " +
                "(random_uuid(), '" + companyId + "', 'CS01', 'GENERAL', 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    String req = """
                        {
                            "idempotencyKey": "concurrent-one-space-%d",
                            "plate": "CONO%02d",
                            "type": "CAR",
                            "rateId": "%s",
                            "operatorUserId": "%s",
                            "site": "DEFAULT",
                            "terminal": "TERM1",
                            "vehicleCondition": "Sin novedades"
                        }
                        """.formatted(index, index, rateId, adminUserId);

                    int status = mockMvc.perform(post("/api/v1/operations/entries")
                            .cookie(new jakarta.servlet.http.Cookie("parkflow_access", token))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(req))
                            .andReturn().getResponse().getStatus();

                    if (status == 201) {
                        successCount.incrementAndGet();
                    } else if (status == 409) {
                        conflictCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    done.countDown();
                }
            });
        }

        latch.countDown(); // trigger parallel execution
        done.await();
        executor.shutdown();

        // One should succeed, the other should fail with 409
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);
    }
}
