package com.parkflow.modules.onboarding.application.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Service;

/**
 * Service to handle idempotency for critical onboarding operations.
 * Uses Caffeine cache with a TTL to prevent double-submissions from rapid retries.
 */
@Service
public class IdempotencyService {

  // Cache to store idempotency key -> cached response
  private final Cache<UUID, OnboardingStatusResponse> idempotencyCache;

  public IdempotencyService() {
    this.idempotencyCache = Caffeine.newBuilder()
        .expireAfterWrite(1, TimeUnit.HOURS)
        .maximumSize(10_000)
        .build();
  }

  /**
   * Retrieves the cached response for a given idempotency key, if any.
   */
  public OnboardingStatusResponse getCachedResponse(UUID idempotencyKey) {
    if (idempotencyKey == null) return null;
    return idempotencyCache.getIfPresent(idempotencyKey);
  }

  /**
   * Saves the response for a given idempotency key.
   */
  public void cacheResponse(UUID idempotencyKey, OnboardingStatusResponse response) {
    if (idempotencyKey != null && response != null) {
      idempotencyCache.put(idempotencyKey, response);
    }
  }
}
