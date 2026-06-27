package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.application.port.in.TokenRefreshUseCase;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.application.port.out.AuthCompanyPort;
import com.parkflow.modules.auth.application.port.out.AuthSessionPort;
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

    current.setActive(false);
    current.setRevokedAt(OffsetDateTime.now());
    authSessionRepository.save(current);

    AppUser user = current.getUser();
    AuthorizedDevice device = current.getDevice();
    if (!user.isActive() || !device.isAuthorized()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Sesion invalida por estado de usuario/dispositivo");
    }

    AuthSession rotated = new AuthSession();
    rotated.setUser(user);
    rotated.setDevice(device);
    rotated.setRefreshJti(UUID.randomUUID().toString());
    rotated.setRefreshExpiresAt(OffsetDateTime.now().plus(jwtTokenService.refreshTtl()));
    rotated.setAccessExpiresAt(OffsetDateTime.now().plus(jwtTokenService.accessTtl()));
    rotated.setRefreshTokenHash("pending");
    rotated = authSessionRepository.save(rotated);

    String refreshToken =
        jwtTokenService.createRefreshToken(user.getId(), rotated.getId(), rotated.getRefreshJti());
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
