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
import com.parkflow.modules.auth.security.RolePermissions;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
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
public class LoginUseCaseImpl implements LoginUseCase {

  private final AppUserRepository appUserRepository;
  private final AuthorizedDevicePort authorizedDeviceRepository;
  private final AuthSessionPort authSessionRepository;
  private final JwtTokenService jwtTokenService;
  private final PasswordHashService passwordHashService;
  private final AuthAuditService authAuditService;
  private final AuditPort globalAuditService;
  private final AuthCompanyPort authCompanyPort;
  private final AuthenticationResponseAssembler responseAssembler;

  @Value("${app.security.offline-lease-hours:48}")
  private int defaultOfflineLeaseHours;

  @Value("${app.security.lockout-minutes:30}")
  private int lockoutMinutes;

  @Override
  @Transactional
  @Auditable(module = "SEGURIDAD", action = "LOGIN", entityClass = AuthSession.class)
  public LoginResult login(LoginRequest request) {
    String email = request.email().trim();
    String deviceId = request.deviceId();

    log.info("AUTH: Login attempt - email={}, deviceId={}, platform={}",
        maskEmail(email), deviceId, request.platform());

    AppUser user = appUserRepository.findGlobalByEmail(email).orElse(null);

    if (user == null) {
      log.warn("AUTH: Login failed - user not found - email={}, deviceId={}", maskEmail(email), deviceId);
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
            user.getId(), maskEmail(email), user.getBlockedUntil());
        authAuditService.log(
            AuthAuditAction.LOGIN_FAILED, user, null, "DENY_ACCOUNT_BLOCKED",
            Map.of("email", email, "deviceId", deviceId));
        throw new OperationException(HttpStatus.FORBIDDEN, "Cuenta bloqueada. Intente de nuevo en " + lockoutMinutes + " minutos o contacte al administrador.");
      }
    }

    if (!user.isActive()) {
      log.warn("AUTH: Login failed - account inactive - userId={}, email={}", user.getId(), maskEmail(email));
      authAuditService.log(
          AuthAuditAction.LOGIN_FAILED, user, null, "DENY_ACCOUNT_INACTIVE",
          Map.of("email", email, "deviceId", deviceId));
      throw new OperationException(HttpStatus.FORBIDDEN, "Cuenta desactivada. Contacte al administrador.");
    }

    if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
      log.warn("AUTH: Login failed - no password set - userId={}, email={}", user.getId(), maskEmail(email));
      throw invalidCredentials(user, email, deviceId);
    }

    if (!passwordHashService.matchesPassword(request.password(), user.getPasswordHash())) {
      log.warn("AUTH: Login failed - invalid password - userId={}, email={}", user.getId(), maskEmail(email));
      throw invalidCredentials(user, email, deviceId);
    }

    log.info("AUTH: Login credentials validated - userId={}, email={}", user.getId(), maskEmail(email));
    
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

    AuthSession session = new AuthSession();
    session.setUser(user);
    session.setDevice(device);
    session.setRefreshJti(UUID.randomUUID().toString());
    session.setRefreshExpiresAt(OffsetDateTime.now().plus(jwtTokenService.refreshTtl()));
    session.setAccessExpiresAt(OffsetDateTime.now().plus(jwtTokenService.accessTtl()));
    session.setRefreshTokenHash("pending");
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

  private String maskEmail(String email) {
    if (email == null || email.length() < 3 || !email.contains("@")) {
      return "***";
    }
    String[] parts = email.split("@");
    String local = parts[0];
    String domain = parts[1];

    if (local.length() <= 1) {
      return "***@" + domain;
    }

    return local.charAt(0) + "***@" + domain;
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
