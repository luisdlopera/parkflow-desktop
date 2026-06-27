package com.parkflow.modules.auth.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.Arrays;

/**
 * Centralized factory for creating and clearing authentication cookies.
 * Ensures consistent HttpOnly, SameSite, Secure, and Max-Age attributes across all auth endpoints.
 */
@Component
public class AuthCookieFactory {

  private final Environment environment;

  @Value("${app.security.access-token-ttl-minutes:15}")
  private int accessTokenTtlMinutes;

  @Value("${app.security.refresh-token-ttl-days:7}")
  private int refreshTokenTtlDays;

  @Value("${app.security.cookie.secure:false}")
  private boolean cookieSecure;

  @Value("${app.security.cookie.same-site:Lax}")
  private String cookieSameSite;

  public AuthCookieFactory(Environment environment) {
    this.environment = environment;
  }

  /**
   * Determine if Secure attribute should be enabled based on profile and explicit config.
   * - Production/HTTPS: always true
   * - Dev/localhost: respects app.security.cookie.secure (defaults to false)
   */
  private boolean isSecureEnabled() {
    // Explicit override in config
    if (cookieSecure) return true;

    // Auto-detect production (any non-dev profile)
    String[] profiles = environment.getActiveProfiles();
    if (profiles != null && profiles.length > 0) {
      boolean isDev = Arrays.stream(profiles)
          .anyMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("local") || p.equalsIgnoreCase("test"));
      return !isDev; // Secure=true in prod
    }

    return false; // Default to false for dev
  }

  /**
   * Set both access and refresh token cookies on the response.
   */
  public void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
    long accessMaxAge = accessTokenTtlMinutes * 60L;
    long refreshMaxAge = refreshTokenTtlDays * 86400L;

    response.addHeader("Set-Cookie", buildCookie("parkflow_access", accessToken, accessMaxAge));
    response.addHeader("Set-Cookie", buildCookie("parkflow_refresh", refreshToken, refreshMaxAge));
  }

  /**
   * Clear both access and refresh token cookies.
   */
  public void clearAuthCookies(HttpServletResponse response) {
    response.addHeader("Set-Cookie", buildCookie("parkflow_access", "", 0));
    response.addHeader("Set-Cookie", buildCookie("parkflow_refresh", "", 0));
  }

  /**
   * Build a Set-Cookie header value with proper attributes.
   */
  private String buildCookie(String name, String value, long maxAgeSecs) {
    ResponseCookie cookie = ResponseCookie
        .from(name, value)
        .httpOnly(true)
        .secure(isSecureEnabled())
        .sameSite(cookieSameSite)
        .path("/")
        .maxAge(Duration.ofSeconds(maxAgeSecs))
        .build();

    return cookie.toString();
  }
}
