package com.parkflow.modules.auth.security;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Disabled("Requires Docker environment for Testcontainers")
@SpringBootTest
@Testcontainers
public class TenantIsolationSecurityIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("parkflow_test")
            .withUsername("parkflow")
            .withPassword("parkflow");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
        // Evitar que Liquibase/Flyway choque si hay configs adicionales, Flyway creará el schema en V001
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
    }

    @Autowired
    private AppUserPort appUserPort;

    private UUID tenantA;
    private UUID tenantB;
    private AppUser userA;
    private AppUser userB;

    @BeforeEach
    void setUp() {
        tenantA = UUID.randomUUID();
        tenantB = UUID.randomUUID();

        // Limpiar el contexto para poder insertar datos iniciales libremente
        TenantContext.clear();

        userA = new AppUser();
        userA.setCompanyId(tenantA);
        userA.setEmail("userA@example.com");
        userA.setRole(UserRole.ADMIN);
        userA.setPasswordHash("hashA");
        userA.setActive(true);
        appUserPort.save(userA);

        userB = new AppUser();
        userB.setCompanyId(tenantB);
        userB.setEmail("userB@example.com");
        userB.setRole(UserRole.ADMIN);
        userB.setPasswordHash("hashB");
        userB.setActive(true);
        appUserPort.save(userB);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        appUserPort.delete(userA);
        appUserPort.delete(userB);
    }

    @Test
    void testTenantIsolation_AppUser_RLS_Enforced() {
        // Act & Assert - As Tenant A
        TenantContext.setTenantId(tenantA);

        Optional<AppUser> foundA = appUserPort.findById(userA.getId());
        assertThat(foundA).isPresent();
        assertThat(foundA.get().getCompanyId()).isEqualTo(tenantA);

        Optional<AppUser> foundBInA = appUserPort.findById(userB.getId());
        assertThat(foundBInA).isEmpty(); // Tenant A cannot see Tenant B's data due to RLS!

        // Act & Assert - As Tenant B
        TenantContext.setTenantId(tenantB);

        Optional<AppUser> foundB = appUserPort.findById(userB.getId());
        assertThat(foundB).isPresent();
        assertThat(foundB.get().getCompanyId()).isEqualTo(tenantB);

        Optional<AppUser> foundAInB = appUserPort.findById(userA.getId());
        assertThat(foundAInB).isEmpty(); // Tenant B cannot see Tenant A's data
    }
}
