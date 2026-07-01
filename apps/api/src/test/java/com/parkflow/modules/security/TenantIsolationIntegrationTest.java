package com.parkflow.modules.security;

import com.parkflow.modules.auth.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Testcontainers
public class TenantIsolationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("parkflow")
            .withUsername("parkflow")
            .withPassword("parkflow");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        // Clean up the dummy table after tests
        jdbcTemplate.execute("DELETE FROM dummy_table");
    }

    @Test
    void testTenantIsolationAndConnectionLeak() throws InterruptedException {
        // Create a dummy table mimicking a multi-tenant table if it doesn't exist
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS dummy_table (id SERIAL PRIMARY KEY, company_id UUID, data VARCHAR(255))");
        try {
            jdbcTemplate.execute("ALTER TABLE dummy_table ENABLE ROW LEVEL SECURITY");
            jdbcTemplate.execute("ALTER TABLE dummy_table FORCE ROW LEVEL SECURITY");
            jdbcTemplate.execute("CREATE POLICY tenant_isolation_policy ON dummy_table AS PERMISSIVE FOR ALL TO PUBLIC USING (company_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (company_id = current_setting('app.tenant_id', true)::uuid)");
        } catch (Exception e) {
            // Policy might already exist, ignore for test simplicity
        }

        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();

        // Tenant A inserts data
        TenantContext.setTenantId(tenantA);
        jdbcTemplate.update("INSERT INTO dummy_table (company_id, data) VALUES (?, ?)", tenantA, "Data A");

        // Tenant B inserts data
        TenantContext.setTenantId(tenantB);
        jdbcTemplate.update("INSERT INTO dummy_table (company_id, data) VALUES (?, ?)", tenantB, "Data B");

        // Verify isolation
        TenantContext.setTenantId(tenantA);
        Integer countA = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dummy_table", Integer.class);
        assertEquals(1, countA, "Tenant A should only see 1 record");

        TenantContext.setTenantId(tenantB);
        Integer countB = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dummy_table", Integer.class);
        assertEquals(1, countB, "Tenant B should only see 1 record");

        // Test connection leak with multiple threads
        int threadCount = 20;
        ExecutorService executorService = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger errorCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            boolean isTenantA = i % 2 == 0;
            executorService.submit(() -> {
                try {
                    UUID currentTenant = isTenantA ? tenantA : tenantB;
                    TenantContext.setTenantId(currentTenant);
                    
                    Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dummy_table", Integer.class);
                    if (count != 1) {
                        errorCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    TenantContext.clear();
                    latch.countDown();
                }
            });
        }

        latch.await();
        assertEquals(0, errorCount.get(), "There should be no connection leaks or context bleeding");
        
        TenantContext.clear();
        Integer countGlobal = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dummy_table", Integer.class);
        assertEquals(0, countGlobal, "Unauthenticated queries should see 0 records due to strict RLS");
    }
}
