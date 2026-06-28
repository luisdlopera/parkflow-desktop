package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.audit.domain.Auditable;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.application.port.in.LoginUseCase;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthCompanyPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.LoginResponse;
import com.parkflow.modules.auth.dto.LoginResult;
import com.parkflow.modules.auth.security.JwtTokenService;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.PasswordValidationService;
import com.parkflow.modules.auth.security.RolePermissions;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoginUseCaseImpl implements LoginUseCase {

  private final AppUserPort appUserRepository;
  private final AuthorizedDevicePort authorizedDeviceRepository;
  private final AuthSessionPort authSessionRepository;
  private final JwtTokenService jwtTokenService;
  private final PasswordHashService passwordHashService;
  private final PasswordValidationService passwordValidationService;
  private final AuthAuditService authAuditService;
  private final AuditPort globalAuditService;
  private final AuthCompanyPort authCompanyPort;
  private final AuthenticationResponseAssembler responseAssembler;

  @Value("${app.security.offline-lease-hours:48}")
  private int defaultOfflineLeaseHours;

  @Value("${app.security.lockout-minutes:30}")
  private int lockoutMinutes;

  @Value("${app.security.max-concurrent-sessions:5}")
  private int maxConcurrentSessions;

  @Override
  @Transactional
  @Auditable(module = "SEGURIDAD", action = "LOGIN", entityClass = AuthSession.class)
  public LoginResult login(LoginRequest request) {
    String email = request.email().trim();
    String deviceId = request.deviceId();

    log.info("AUTH: Login attempt - email={}, deviceId={}, platform={}",
        SecurityUtils.maskEmail(email), deviceId, request.platform());

    AppUser user = appUserRepository.findGlobalByEmail(email).orElse(null);

    if (user == null) {
      log.warn("AUTH: Login failed - user not found - email={}, deviceId={}", SecurityUtils.maskEmail(email), deviceId);
      throw invalidCredentials(null, email, deviceId);
    }

    if (user.isBlocked()) {
      // Auto-unlock: if the lockout window has expired, unblock the user transparently
      if (user.getBlockedUntil() != null && OffsetDateTime.now().isAfter(user.getBlockedUntil())) {
        log.info("AUTH: Auto-unlock expired lockout - userId={}", user.getId());
        user.setBlocked(false);
        user.setFailedLoginAttempts(0);
        user.setBlockedUntil(null);
        appUserRepository.save(user);
      } else {
        log.warn("AUTH: Login failed - account blocked - userId={}, email={}, blockedUntil={}",
            user.getId(), SecurityUtils.maskEmail(email), user.getBlockedUntil());
        authAuditService.log(
            AuthAuditAction.LOGIN_FAILED, user, null, "DENY_ACCOUNT_BLOCKED",
            Map.of("email", email, "deviceId", deviceId));
        throw new OperationException(HttpStatus.FORBIDDEN, "Cuenta bloqueada. Intente de nuevo en " + lockoutMinutes + " minutos o contacte al administrador.");
      }
    }

    if (!user.isActive()) {
      log.warn("AUTH: Login failed - account inactive - userId={}, email={}", user.getId(), SecurityUtils.maskEmail(email));
      authAuditService.log(
          AuthAuditAction.LOGIN_FAILED, user, null, "DENY_ACCOUNT_INACTIVE",
          Map.of("email", email, "deviceId", deviceId));
      throw new OperationException(HttpStatus.FORBIDDEN, "Cuenta desactivada. Contacte al administrador.");
    }

    if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
      log.warn("AUTH: Login failed - no password set - userId={}, email={}", user.getId(), SecurityUtils.maskEmail(email));
      throw invalidCredentials(user, email, deviceId);
    }

    if (!passwordHashService.matchesPassword(request.password(), user.getPasswordHash())) {
      log.warn("AUTH: Login failed - invalid password - userId={}, email={}", user.getId(), SecurityUtils.maskEmail(email));
      throw invalidCredentials(user, email, deviceId);
    }

    // [SECURITY] Validate password is not in common password list
    passwordValidationService.validatePasswordNotCommon(request.password());

    log.info("AUTH: Login credentials validated - userId={}, email={}", user.getId(), SecurityUtils.maskEmail(email));
    
    // Reset failed attempts on success
    if (user.getFailedLoginAttempts() > 0) {
      user.setFailedLoginAttempts(0);
    }

    user.setLastAccessAt(OffsetDateTime.now());
    appUserRepository.save(user);

    AuthorizedDevice device = upsertDevice(request, user);
    if (!device.isAuthorized()) {
      authAuditService.log(
          AuthAuditAction.LOGIN_FAILED,
          user,
          device,
          "DENY_DEVICE_REVOKED",
          Map.of("deviceId", request.deviceId()));
      throw new OperationException(HttpStatus.FORBIDDEN, "Equipo revocado");
    }

    // [SECURITY] Enforce max concurrent sessions limit
    List<AuthSession> activeSessions = authSessionRepository.findByUserAndActiveTrue(user)
        .stream()
        .filter(s -> s.getDevice() != null && s.getDevice().isAuthorized())
        .collect(Collectors.toList());

    if (activeSessions.size() >= maxConcurrentSessions) {
      AuthSession oldest = activeSessions.stream()
          .min(Comparator.comparing(AuthSession::getCreatedAt))
          .orElse(null);

      if (oldest != null) {
        oldest.setActive(false);
        oldest.setRevokedAt(OffsetDateTime.now());
        authSessionRepository.save(oldest);

        log.info("AUTH: Session limit exceeded - revoked oldest session - userId={}, revokedSessionId={}, reason=CONCURRENT_LIMIT",
            user.getId(), oldest.getId());
        authAuditService.log(
            AuthAuditAction.LOGIN_SUCCESS,
            user,
            device,
            "REVOKED_OLDEST_SESSION_FOR_LIMIT",
            Map.of("revokedSessionId", oldest.getId().toString(), "sessionCount", String.valueOf(activeSessions.size())));
      }
    }

    AuthSession session = new AuthSession();
    session.setUser(user);
    session.setDevice(device);
    session.setCompanyId(user.getCompanyId());
    session.setRefreshJti(UUID.randomUUID().toString());
    session.setRefreshExpiresAt(OffsetDateTime.now().plus(jwtTokenService.refreshTtl()));
    session.setAccessExpiresAt(OffsetDateTime.now().plus(jwtTokenService.accessTtl()));
    session.setRefreshTokenHash("pending:" + UUID.randomUUID());
    session = authSessionRepository.save(session);

    String refreshToken = jwtTokenService.createRefreshToken(user.getId(), session.getId(), session.getRefreshJti());
    session.setRefreshTokenHash(passwordHashService.sha256(refreshToken));
    session = authSessionRepository.save(session);

    String accessToken =
        jwtTokenService.createAccessToken(
            user.getId(), user.getCompanyId(), session.getId(), user.getEmail(), RolePermissions.claims(user.getRole()));

    authAuditService.log(
        AuthAuditAction.LOGIN_SUCCESS,
        user,
        device,
        "OK",
        Map.of("sessionId", session.getId().toString()));

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.LOGIN,
        user,
        null,
        "Login success",
        "Session ID: " + session.getId());

    boolean onboardingCompleted = authCompanyPort.isOnboardingCompleted(user.getCompanyId());

    return new LoginResult(
        new LoginResponse(
            responseAssembler.toUser(user, onboardingCompleted),
            responseAssembler.toSession(session),
            responseAssembler.toDevice(device),
            responseAssembler.offlineLease(session, request.offlineRequestedHours(), defaultOfflineLeaseHours)
        ),
        accessToken,
        refreshToken
    );
  }


  private OperationException invalidCredentials(AppUser user, String email, String deviceId) {
    if (user != null) {
      user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
      if (user.getFailedLoginAttempts() >= 5) {
        user.setBlocked(true);
        user.setBlockedUntil(OffsetDateTime.now().plusMinutes(lockoutMinutes));
        log.warn("AUTH: Account locked - userId={}, unlocksAt={}", user.getId(), user.getBlockedUntil());
      }
      appUserRepository.save(user);
    }

    authAuditService.log(
        AuthAuditAction.LOGIN_FAILED,
        user,
        null,
        "DENY_INVALID_CREDENTIALS",
        Map.of("email", email, "deviceId", deviceId));
    return new OperationException(
        HttpStatus.UNAUTHORIZED, "AUTH_INVALID_CREDENTIALS", "Credenciales invalidas");
  }

  private AuthorizedDevice upsertDevice(LoginRequest request, AppUser user) {
    AuthorizedDevice device =
        authorizedDeviceRepository.findByDeviceId(request.deviceId()).orElseGet(AuthorizedDevice::new);
    device.setDeviceId(request.deviceId());
    device.setDisplayName(request.deviceName());
    device.setPlatform(request.platform());
    // [A3] Store SHA-256 hash of fingerprint — never the raw value
    if (request.fingerprint() != null) {
      device.setFingerprintHash(passwordHashService.sha256(request.fingerprint()));
    }
    device.setLastSeenAt(OffsetDateTime.now());
    if (device.getId() == null) {
      device.setAuthorized(true);
    }
    if (user.getCompanyId() != null) {
      device.setCompanyId(user.getCompanyId());
    }
    return authorizedDeviceRepository.save(device);
  }
}
