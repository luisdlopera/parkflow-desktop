package com.parkflow.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Configuration;

/**
 * SECURITY: Rate limiting configuration to prevent brute force attacks and DoS.
 * Different limits for different endpoints:
 * - Login: 10 requests per minute (strict to prevent brute force)
 * - Operations (entry/exit): 100 requests per minute per user
 * - API general: 200 requests per minute
 */
@Configuration
public class RateLimitConfig {

  // In-memory buckets per IP address (for stateless rate limiting)
  private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
  private final Map<String, Bucket> operationBuckets = new ConcurrentHashMap<>();
  private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

  /**
   * Login endpoint: 10 requests per minute.
   * Strict limit to prevent brute force password attacks.
   */
  public Bucket resolveLoginBucket(String key) {
    return loginBuckets.computeIfAbsent(key, k -> Bucket.builder()
        .addLimit(Bandwidth.builder().capacity(10).refillIntervally(10, Duration.ofMinutes(1)).build())
        .build());
  }

  /**
   * Operations endpoints (entry, exit): 100 requests per minute.
   * Prevents accidental flooding while allowing normal operations.
   */
  public Bucket resolveOperationBucket(String key) {
    return operationBuckets.computeIfAbsent(key, k -> Bucket.builder()
        .addLimit(Bandwidth.builder().capacity(100).refillIntervally(100, Duration.ofMinutes(1)).build())
        .build());
  }

  /**
   * General API: 200 requests per minute.
   * Standard limit for read operations.
   */
  public Bucket resolveGeneralBucket(String key) {
    return generalBuckets.computeIfAbsent(key, k -> Bucket.builder()
        .addLimit(Bandwidth.builder().capacity(200).refillIntervally(200, Duration.ofMinutes(1)).build())
        .build());
  }

  /**
   * Clear all buckets (useful for testing or periodic cleanup).
   */
  public void clearAllBuckets() {
    loginBuckets.clear();
    operationBuckets.clear();
    generalBuckets.clear();
  }
}
