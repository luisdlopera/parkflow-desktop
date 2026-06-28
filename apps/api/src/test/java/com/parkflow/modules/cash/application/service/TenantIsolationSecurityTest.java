package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Tenant Isolation Security Tests")
class TenantIsolationSecurityTest {

  private UUID companyA = UUID.randomUUID();
  private UUID companyB = UUID.randomUUID();

  @BeforeEach
  void setup() {
    TenantContext.clear();
  }

  @Test
  @DisplayName("Should throw when TenantContext is null (missing tenant header)")
  void testMissingTenantHeader() {
    // Arrange
    TenantContext.clear(); // Simulates missing X-Tenant-ID header
    UUID sessionId = UUID.randomUUID();

    // Act & Assert
    assertThrows(
        OperationException.class,
        () -> {
          // This would be called by any of the three fixed services
          UUID result = TenantContext.getTenantIdOrThrow();
          fail("Should have thrown OperationException");
        },
        "getTenantIdOrThrow() must throw when tenant context is null"
    );
  }

  @Test
  @DisplayName("getTenantIdOrThrow should return valid tenant ID")
  void testValidTenantContext() {
    // Arrange
    TenantContext.setTenantId(companyA);

    // Act
    UUID result = TenantContext.getTenantIdOrThrow();

    // Assert
    assertEquals(companyA, result, "Should return the set tenant ID");
  }

  @Test
  @DisplayName("Null check in getTenantId() must not bypass validation")
  void testNullCheckBypassPrevention() {
    // This test documents the vulnerability fix:
    // BEFORE: if (TenantContext.getTenantId() != null && !session.getCompanyId().equals(...))
    // AFTER:  UUID tenantId = TenantContext.getTenantIdOrThrow()

    // Arrange
    TenantContext.clear();

    // Act & Assert
    OperationException ex = assertThrows(
        OperationException.class,
        TenantContext::getTenantIdOrThrow
    );
    assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    assertTrue(ex.getMessage().contains("tenant"));
  }
}
