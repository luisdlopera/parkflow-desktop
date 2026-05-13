package com.parkflow.config;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * SECURITY: Rate limiting filter to prevent brute force attacks and DoS.
 * Applied before authentication to protect against unauthenticated attacks.
 * Order: 2 (runs after CorrelationIdFilter, before security filters)
 */
@Component
@Order(2)
public class RateLimitFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

  private final RateLimitConfig rateLimitConfig;

  public RateLimitFilter(RateLimitConfig rateLimitConfig) {
    this.rateLimitConfig = rateLimitConfig;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    String path = request.getRequestURI();
    String clientIp = getClientIp(request);
    String key = clientIp + ":" + path;

    Bucket bucket = resolveBucket(path, key);
    ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

    if (probe.isConsumed()) {
      // Add rate limit headers for transparency
      response.addHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
      filterChain.doFilter(request, response);
    } else {
      // Rate limit exceeded
      long waitForRefill = probe.getNanosToWaitForRefill() / 1_000_000_000; // Convert to seconds
      log.warn("SECURITY: Rate limit exceeded for IP={}, path={}, wait={}s", clientIp, path, waitForRefill);

      response.setStatus(429); // Too Many Requests
      response.setContentType("application/json");
      response.addHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(waitForRefill));
      response.getWriter().write(
          "{\"error\":\"Rate limit exceeded. Please try again in " + waitForRefill + " seconds.\"}");
    }
  }

  /**
   * Resolve the appropriate bucket based on the request path.
   */
  private Bucket resolveBucket(String path, String key) {
    if (path.contains("/auth/login")) {
      return rateLimitConfig.resolveLoginBucket(key);
    } else if (path.contains("/entries") || path.contains("/exits") || path.contains("/reprint")) {
      return rateLimitConfig.resolveOperationBucket(key);
    } else {
      return rateLimitConfig.resolveGeneralBucket(key);
    }
  }

  /**
   * Extract client IP address, considering proxy headers.
   */
  private String getClientIp(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
      // Take the first IP in the chain (original client)
      return xForwardedFor.split(",")[0].trim();
    }

    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isEmpty()) {
      return xRealIp;
    }

    return request.getRemoteAddr();
  }

  @Override
  protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
    String path = request.getRequestURI();
    // Don't rate limit health checks and actuator endpoints
    return path.startsWith("/actuator/health")
        || path.startsWith("/actuator/info")
        || path.equals("/");
  }
}
