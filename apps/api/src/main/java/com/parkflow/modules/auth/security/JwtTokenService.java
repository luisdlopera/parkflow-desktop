package com.parkflow.modules.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenService {
  private final SecretKey key;
  private final Duration accessTtl;
  private final Duration refreshTtl;
  private final long allowedClockSkewSeconds;

  private static final Logger log = LoggerFactory.getLogger(JwtTokenService.class);

  public JwtTokenService(
      @Value("${app.security.jwt-secret}") String jwtSecret,
      @Value("${app.security.access-token-ttl-minutes:15}") long accessTokenTtlMinutes,
      @Value("${app.security.refresh-token-ttl-days:7}") long refreshTokenTtlDays,
      @Value("${app.security.jwt-clock-skew-seconds:30}") long clockSkewSeconds,
      Environment environment) {
    byte[] bytes = null;
    try {
      bytes = Decoders.BASE64URL.decode(jwtSecret);
    } catch (Exception e) {
      try {
        bytes = Decoders.BASE64.decode(jwtSecret);
      } catch (Exception ex) {
        // leave bytes null - will handle below
      }
    }

    // If decoded bytes are present but too short, or decoding failed, handle based on active profile
    boolean isNonProd = false;
    try {
      String[] profiles = environment.getActiveProfiles();
      // If no active profiles are set, treat as non-production for developer convenience
      if (profiles == null || profiles.length == 0) {
        isNonProd = true;
      } else {
        for (String p : profiles) {
          String pp = p == null ? "" : p.toLowerCase();
          if (pp.equals("dev") || pp.equals("local") || pp.equals("test") || pp.equals("ci")) {
            isNonProd = true;
            break;
          }
        }
      }
    } catch (Exception ignored) {
      // If we cannot read profiles, assume non-production to avoid blocking local development
      isNonProd = true;
    }

    if (bytes == null || bytes.length < 32 || jwtSecret == null || jwtSecret.startsWith("REPLACE_")) {
      if (isNonProd) {
        // Derive a 256-bit key deterministically from the provided secret for development convenience
        log.warn("app.security.jwt-secret provided is shorter than 256 bits or not valid base64. Deriving a 256-bit key via SHA-256 because active profile is development/test.");
        try {
          MessageDigest md = MessageDigest.getInstance("SHA-256");
          String secretToHash = jwtSecret != null ? jwtSecret : "default_dev_secret_replace_me";
          byte[] derived = md.digest(secretToHash.getBytes(StandardCharsets.UTF_8));
          this.key = Keys.hmacShaKeyFor(derived);
        } catch (Exception ex) {
          throw new IllegalStateException("Unable to derive JWT key for development profile", ex);
        }
      } else {
        throw new IllegalStateException(
            "SECURITY: app.security.jwt-secret must be a 256-bit (or larger) key encoded in base64/base64url. "
                + "Generate one with: openssl rand -base64 32 | tr -d '\n' and set PARKFLOW_JWT_SECRET_BASE64 env var. Provided key decodes to "
                + (bytes == null ? 0 : bytes.length * 8) + " bits.");
      }
    } else {
      this.key = Keys.hmacShaKeyFor(bytes);
    }
    this.accessTtl = Duration.ofMinutes(Math.max(5, accessTokenTtlMinutes));
    this.refreshTtl = Duration.ofDays(Math.max(1, refreshTokenTtlDays));
    this.allowedClockSkewSeconds = Math.max(0, clockSkewSeconds);
  }

  public String createAccessToken(
      UUID userId, UUID companyId, UUID sessionId, String email, Map<String, Object> claims) {
    OffsetDateTime now = OffsetDateTime.now();
    OffsetDateTime exp = now.plus(accessTtl);
    return Jwts.builder()
        .subject(userId.toString())
        .issuedAt(Date.from(now.toInstant()))
        .expiration(Date.from(exp.toInstant()))
        .claim("cid", companyId.toString())
        .claim("sid", sessionId.toString())
        .claim("email", email)
        .claims(claims)
        .signWith(key)
        .compact();
  }

  public String createRefreshToken(UUID userId, UUID sessionId, String refreshJti) {
    return createRefreshToken(userId, sessionId, refreshJti, null, 1);
  }

  public String createRefreshToken(UUID userId, UUID sessionId, String refreshJti,
      UUID familyId, int generation) {
    OffsetDateTime now = OffsetDateTime.now();
    OffsetDateTime exp = now.plus(refreshTtl);
    var builder = Jwts.builder()
        .subject(userId.toString())
        .issuedAt(Date.from(now.toInstant()))
        .expiration(Date.from(exp.toInstant()))
        .claim("sid", sessionId.toString())
        .claim("jti", refreshJti)
        .claim("typ", "refresh");

    if (familyId != null) {
      builder.claim("fid", familyId.toString());
      builder.claim("gen", generation);
    }

    return builder.signWith(key).compact();
  }

  public Claims parse(String token) {
    return Jwts.parser()
        .clockSkewSeconds(allowedClockSkewSeconds)
        .verifyWith(key)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  public Duration accessTtl() {
    return accessTtl;
  }

  public Duration refreshTtl() {
    return refreshTtl;
  }

  public UUID extractFamilyId(String token) {
    try {
      Claims claims = parse(token);
      String fid = claims.get("fid", String.class);
      return fid != null ? UUID.fromString(fid) : null;
    } catch (Exception e) {
      log.debug("Failed to extract family ID from token", e);
      return null;
    }
  }

  public Integer extractGeneration(String token) {
    try {
      Claims claims = parse(token);
      Integer gen = claims.get("gen", Integer.class);
      return gen != null ? gen : 1;
    } catch (Exception e) {
      log.debug("Failed to extract generation from token", e);
      return 1;
    }
  }
}
