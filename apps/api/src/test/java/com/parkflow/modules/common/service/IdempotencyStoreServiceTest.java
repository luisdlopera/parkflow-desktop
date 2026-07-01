package com.parkflow.modules.common.service;

import java.time.Duration;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IdempotencyStoreServiceTest {

  private final IdempotencyStoreService service = new IdempotencyStoreService();

  @Test
  void reservesSameMethodUriAndKeyOnlyOnceWhenRedisIsUnavailable() {
    assertTrue(service.reserve("POST", "/api/v1/configuration/rates", "abc-123", Duration.ofHours(1)));
    assertFalse(service.reserve("POST", "/api/v1/configuration/rates", "abc-123", Duration.ofHours(1)));
  }

  @Test
  void scopesReservationByMethodAndUri() {
    assertTrue(service.reserve("POST", "/api/v1/configuration/rates", "shared", Duration.ofHours(1)));
    assertTrue(service.reserve("PUT", "/api/v1/configuration/rates/1", "shared", Duration.ofHours(1)));
  }
}
