package com.parkflow.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.context.annotation.Configuration;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;

/**
 * SECURITY: Rate limiting configuration to prevent brute force attacks and DoS.
 * Different limits for different endpoints:
 * - Login: 10 requests per minute (strict to prevent brute force)
 * - Operations (entry/exit): 100 requests per minute per user
 * - API general: 200 requests per minute
 */
@Configuration
public class RateLimitConfig {

  // Optional distributed proxy manager
  private final Optional<ProxyManager<byte[]>> proxyManager;

  // In-memory buckets fallback per IP address
  private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
  private final Map<String, Bucket> operationBuckets = new ConcurrentHashMap<>();
  private final Map<String, Bucket> reprintBuckets = new ConcurrentHashMap<>();
  private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

  public RateLimitConfig(Optional<ProxyManager<byte[]>> proxyManager) {
    this.proxyManager = proxyManager;
  }

  private Bucket getBucket(String key, Map<String, Bucket> localMap, Supplier<BucketConfiguration> configSupplier) {
    if (proxyManager.isPresent()) {
      return proxyManager.get().builder().build(key.getBytes(java.nio.charset.StandardCharsets.UTF_8), configSupplier);
    }
    return localMap.computeIfAbsent(key, k -> Bucket.builder().addLimit(configSupplier.get().getBandwidths()[0]).build());
  }

  /**
   * Login endpoint: 10 requests per minute.
   * Strict limit to prevent brute force password attacks.
   */
  public Bucket resolveLoginBucket(String key) {
    return getBucket("login_" + key, loginBuckets, () -> BucketConfiguration.builder()
        .addLimit(Bandwidth.builder().capacity(10).refillIntervally(10, Duration.ofMinutes(1)).build())
        .build());
  }

  /**
   * Operations endpoints (entry, exit): 100 requests per minute.
   * Prevents accidental flooding while allowing normal operations.
   */
  public Bucket resolveOperationBucket(String key) {
    return getBucket("op_" + key, operationBuckets, () -> BucketConfiguration.builder()
        .addLimit(Bandwidth.builder().capacity(100).refillIntervally(100, Duration.ofMinutes(1)).build())
        .build());
  }

  /**
   * Reprint endpoints: 30 requests per minute.
   * Stricter limit to prevent mass reprinting abuse.
   */
  public Bucket resolveReprintBucket(String key) {
    return getBucket("repr_" + key, reprintBuckets, () -> BucketConfiguration.builder()
        .addLimit(Bandwidth.builder().capacity(30).refillIntervally(30, Duration.ofMinutes(1)).build())
        .build());
  }

  /**
   * General API: 200 requests per minute.
   * Standard limit for read operations.
   */
  public Bucket resolveGeneralBucket(String key) {
    return getBucket("gen_" + key, generalBuckets, () -> BucketConfiguration.builder()
        .addLimit(Bandwidth.builder().capacity(200).refillIntervally(200, Duration.ofMinutes(1)).build())
        .build());
  }

  /**
   * Clear all buckets (useful for testing or periodic cleanup).
   */
  public void clearAllBuckets() {
    loginBuckets.clear();
    operationBuckets.clear();
    reprintBuckets.clear();
    generalBuckets.clear();
  }
}
