package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.application.port.in.TokenRefreshUseCase;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import com.parkflow.modules.auth.domain.repository.AuthCompanyPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.RefreshTokenFamilyPort;
import com.parkflow.modules.auth.dto.LoginResponse;
import com.parkflow.modules.auth.dto.LoginResult;
import com.parkflow.modules.auth.dto.RefreshRequest;
import com.parkflow.modules.auth.security.JwtTokenService;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.RolePermissions;
import com.parkflow.modules.common.exception.OperationException;
import io.jsonwebtoken.Claims;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRefreshUseCaseImpl implements TokenRefreshUseCase {

  private final AuthSessionPort authSessionRepository;
  private final RefreshTokenFamilyPort refreshTokenFamilyRepository;
  private final JwtTokenService jwtTokenService;
  private final PasswordHashService passwordHashService;
  private final AuthAuditService authAuditService;
  private final AuthCompanyPort authCompanyPort;
  private final AuthenticationResponseAssembler responseAssembler;

  @Value("${app.security.offline-lease-hours:48}")
  private int defaultOfflineLeaseHours;

  @Override
  @Transactional
  public LoginResult refreshFromCookie(String rawRefreshToken) {
    Claims claims;
    try {
      claims = jwtTokenService.parse(rawRefreshToken);
    } catch (Exception ex) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Tu sesion expiro. Inicia sesion nuevamente.");
    }
    if (!"refresh".equals(claims.get("typ", String.class))) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Tu sesion expiro. Inicia sesion nuevamente.");
    }
    String refreshJti = claims.get("jti", String.class);
    AuthSession session = authSessionRepository
        .findByRefreshJtiAndActiveTrue(refreshJti)
        .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Tu sesion expiro. Inicia sesion nuevamente."));
    String deviceId = session.getDevice().getDeviceId();
    return refresh(new RefreshRequest(deviceId), rawRefreshToken);
  }

  @Override
  @Transactional
  public LoginResult refresh(RefreshRequest request, String rawRefreshToken) {
    Claims claims = jwtTokenService.parse(rawRefreshToken);
    if (!"refresh".equals(claims.get("typ", String.class))) {
      throw new OperationException(
          HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }

    String refreshJti = claims.get("jti", String.class);
    AuthSession current =
        authSessionRepository
            .findByRefreshJtiAndActiveTrue(refreshJti)
            .orElseThrow(
                () ->
                    new OperationException(
                        HttpStatus.UNAUTHORIZED,
                        "AUTH_UNAUTHORIZED",
                        "Tu sesion expiro. Inicia sesion nuevamente."));

    if (!current.getDevice().getDeviceId().equals(request.deviceId())) {
      throw new OperationException(
          HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }

    String incomingHash = passwordHashService.sha256(rawRefreshToken);
    if (!incomingHash.equals(current.getRefreshTokenHash())) {
      current.setActive(false);
      current.setRevokedAt(OffsetDateTime.now());
      authSessionRepository.save(current);
      throw new OperationException(
          HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }

    // [SECURITY] Detect token theft via family generation tracking
    UUID incomingFamilyId = jwtTokenService.extractFamilyId(rawRefreshToken);
    Integer incomingGeneration = jwtTokenService.extractGeneration(rawRefreshToken);

    if (incomingFamilyId != null) {
      RefreshTokenFamily family = refreshTokenFamilyRepository.findById(incomingFamilyId)
          .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Tu sesion expiro. Inicia sesion nuevamente."));

      if (family.isRevoked()) {
        throw new OperationException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Tu sesion expiro. Inicia sesion nuevamente.");
      }

      // THREAT DETECTION: If incoming generation < family generation, token was replayed
      if (incomingGeneration < family.getGenerationNumber()) {
        log.warn("AUTH: Token theft detected - replayed generation - userId={}, familyId={}, incomingGen={}, currentGen={}",
            current.getUser().getId(), incomingFamilyId, incomingGeneration, family.getGenerationNumber());

        family.setRevokedAt(OffsetDateTime.now());
        family.setRevokeReason("THEFT_DETECTED");
        refreshTokenFamilyRepository.save(family);

        authAuditService.log(
            AuthAuditAction.LOGIN_FAILED,
            current.getUser(),
            current.getDevice(),
            "TOKEN_THEFT_DETECTED",
            Map.of("familyId", incomingFamilyId.toString(), "incomingGen", String.valueOf(incomingGeneration), "currentGen", String.valueOf(family.getGenerationNumber())));

        throw new OperationException(HttpStatus.UNAUTHORIZED, "AUTH_UNAUTHORIZED", "Tu sesion expiro. Inicia sesion nuevamente.");
      }
    }

    current.setActive(false);
    current.setRevokedAt(OffsetDateTime.now());
    authSessionRepository.save(current);

    AppUser user = current.getUser();
    AuthorizedDevice device = current.getDevice();
    if (!user.isActive() || !device.isAuthorized()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Sesion invalida por estado de usuario/dispositivo");
    }

    // Handle refresh token family (for theft detection)
    UUID familyId = incomingFamilyId;
    int nextGeneration = 1;

    if (familyId != null) {
      RefreshTokenFamily family = refreshTokenFamilyRepository.findById(familyId).orElseThrow();
      nextGeneration = family.getGenerationNumber() + 1;
      family.setGenerationNumber(nextGeneration);
      refreshTokenFamilyRepository.save(family);
    } else {
      RefreshTokenFamily family = new RefreshTokenFamily();
      family.setFamilyId(UUID.randomUUID());
      family.setUser(user);
      family.setCompanyId(user.getCompanyId());
      family.setGenerationNumber(1);
      family.setCreatedAt(OffsetDateTime.now());
      family = refreshTokenFamilyRepository.save(family);
      familyId = family.getFamilyId();
      nextGeneration = 1;
    }

    AuthSession rotated = new AuthSession();
    rotated.setUser(user);
    rotated.setDevice(device);
    rotated.setCompanyId(user.getCompanyId());
    rotated.setRefreshJti(UUID.randomUUID().toString());
    rotated.setRefreshExpiresAt(OffsetDateTime.now().plus(jwtTokenService.refreshTtl()));
    rotated.setAccessExpiresAt(OffsetDateTime.now().plus(jwtTokenService.accessTtl()));
    rotated.setRefreshTokenHash("pending:" + UUID.randomUUID());
    rotated.setTokenFamilyId(familyId);
    rotated.setTokenGeneration(nextGeneration);
    rotated = authSessionRepository.save(rotated);

    String refreshToken =
        jwtTokenService.createRefreshToken(user.getId(), rotated.getId(), rotated.getRefreshJti(), familyId, nextGeneration);
    rotated.setRefreshTokenHash(passwordHashService.sha256(refreshToken));
    rotated.setLastSeenAt(OffsetDateTime.now());
    rotated = authSessionRepository.save(rotated);

    String accessToken =
        jwtTokenService.createAccessToken(
            user.getId(), user.getCompanyId(), rotated.getId(), user.getEmail(), RolePermissions.claims(user.getRole()));

    authAuditService.log(
        AuthAuditAction.REFRESH,
        user,
        device,
        "OK",
        Map.of("sessionId", rotated.getId().toString()));

    boolean onboardingCompleted = authCompanyPort.isOnboardingCompleted(user.getCompanyId());

    return new LoginResult(
        new LoginResponse(
            responseAssembler.toUser(user, onboardingCompleted),
            responseAssembler.toSession(rotated),
            responseAssembler.toDevice(device),
            responseAssembler.offlineLease(rotated, null, defaultOfflineLeaseHours)
        ),
        accessToken,
        refreshToken
    );
  }
}
