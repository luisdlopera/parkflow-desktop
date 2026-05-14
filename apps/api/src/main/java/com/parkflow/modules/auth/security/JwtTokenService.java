package com.parkflow.modules.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
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

  public JwtTokenService(
      @Value("${app.security.jwt-secret}") String jwtSecret,
      @Value("${app.security.access-token-ttl-minutes:15}") long accessTokenTtlMinutes,
      @Value("${app.security.refresh-token-ttl-days:7}") long refreshTokenTtlDays,
      @Value("${app.security.jwt-clock-skew-seconds:30}") long clockSkewSeconds) {
    byte[] bytes = Decoders.BASE64.decode(jwtSecret);
    this.key = Keys.hmacShaKeyFor(bytes);
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
    OffsetDateTime now = OffsetDateTime.now();
    OffsetDateTime exp = now.plus(refreshTtl);
    return Jwts.builder()
        .subject(userId.toString())
        .issuedAt(Date.from(now.toInstant()))
        .expiration(Date.from(exp.toInstant()))
        .claim("sid", sessionId.toString())
        .claim("jti", refreshJti)
        .claim("typ", "refresh")
        .signWith(key)
        .compact();
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
}
