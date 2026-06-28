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

  @Value("${app.security.cookie.secure:true}")
  private boolean cookieSecure;

  @Value("${app.security.cookie.same-site:Strict}")
  private String cookieSameSite;

  public AuthCookieFactory(Environment environment) {
    this.environment = environment;
  }

  /**
   * Determine if Secure attribute should be enabled.
   * - Production: always true (HTTPS required)
   * - Dev/test: respects explicit config (defaults to true, can override via app.security.cookie.secure=false)
   * SECURITY: Default is true to prevent accidental production deployments without HTTPS.
   */
  private boolean isSecureEnabled() {
    String[] profiles = environment.getActiveProfiles();
    if (profiles == null || profiles.length == 0) {
      // No profile specified - safer to require HTTPS
      return true;
    }

    boolean isDev = Arrays.stream(profiles)
        .anyMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("local") || p.equalsIgnoreCase("test"));

    // Dev can override via config; prod always requires Secure
    if (isDev) {
      return cookieSecure;
    }

    return true; // Production: always Secure
  }

  /**
   * Set both access and refresh token cookies on the response.
   */
  public void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken, boolean rememberMe) {
    long accessMaxAge = accessTokenTtlMinutes * 60L;
    long refreshMaxAge = refreshTokenTtlDays * 86400L;

    response.addHeader("Set-Cookie", buildCookie("parkflow_access", accessToken, rememberMe ? accessMaxAge : -1));
    response.addHeader("Set-Cookie", buildCookie("parkflow_refresh", refreshToken, rememberMe ? refreshMaxAge : -1));
  }

  /**
   * Clear both access and refresh token cookies.
   */
  public void clearAuthCookies(HttpServletResponse response) {
    response.addHeader("Set-Cookie", buildCookie("parkflow_access", "", 0));
    response.addHeader("Set-Cookie", buildCookie("parkflow_refresh", "", 0));
  }

  /**
   * Extract refresh token from request cookies.
   * @return token value, or null if not present
   */
  public String extractRefreshToken(jakarta.servlet.http.HttpServletRequest request) {
    if (request.getCookies() == null) return null;
    for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
      if ("parkflow_refresh".equals(cookie.getName())) {
        String value = cookie.getValue();
        return (value != null && !value.isBlank()) ? value : null;
      }
    }
    return null;
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
