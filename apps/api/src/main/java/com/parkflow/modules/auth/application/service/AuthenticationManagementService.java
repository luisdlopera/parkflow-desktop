package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.application.port.in.AuthenticationUseCase;
import com.parkflow.modules.auth.dto.*;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.auth.security.JwtTokenService;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.RolePermissions;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import io.jsonwebtoken.Claims;
import java.time.OffsetDateTime;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationManagementService implements AuthenticationUseCase {
  private static final Pattern PASSWORD_PATTERN = Pattern.compile(
      "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!.])(?=\\S+$).{8,}$");

  private final AppUserPort appUserRepository;
  private final AuthorizedDevicePort authorizedDevicePort;
  private final AuthSessionPort authSessionPort;
  private final JwtTokenService jwtTokenService;
  private final PasswordHashService passwordHashService;
  private final AuthAuditService authAuditService;
  private final com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  private final AuthenticationResponseAssembler responseAssembler;

  @Value("${app.security.offline-lease-hours:48}")
  private int defaultOfflineLeaseHours;

  @Override
  @Transactional
  public LoginResponse login(LoginRequest request) {
    String email = request.email().trim();
    String deviceId = request.deviceId();

    log.info("AUTH: Login attempt - email={}, deviceId={}, platform={}",
        maskEmail(email), deviceId, request.platform());

    AppUser user = appUserRepository.findGlobalByEmail(email).orElse(null);

    if (user == null) {
      log.warn("AUTH: Login failed - user not found - email={}, deviceId={}", maskEmail(email), deviceId);
      throw invalidCredentials(email, deviceId);
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
      throw invalidCredentials(email, deviceId);
    }

    if (!passwordHashService.matchesPassword(request.password(), user.getPasswordHash())) {
      log.warn("AUTH: Login failed - invalid password - userId={}, email={}", user.getId(), maskEmail(email));
      throw invalidCredentials(email, deviceId);
    }

    log.info("AUTH: Login credentials validated - userId={}, email={}", user.getId(), maskEmail(email));

    user.setLastAccessAt(OffsetDateTime.now());
    appUserRepository.save(user);

    AuthorizedDevice device = upsertDevice(request);
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
    session = authSessionPort.save(session);

    String refreshToken = jwtTokenService.createRefreshToken(user.getId(), session.getId(), session.getRefreshJti());
    session.setRefreshTokenHash(passwordHashService.sha256(refreshToken));
    session = authSessionPort.save(session);

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

    return new LoginResponse(
        accessToken,
        refreshToken,
        "Bearer",
        responseAssembler.toUser(user),
        responseAssembler.toSession(session),
        responseAssembler.toDevice(device),
        responseAssembler.offlineLease(session, request.offlineRequestedHours(), defaultOfflineLeaseHours));
  }

  @Override
  @Transactional
  public LoginResponse refresh(RefreshRequest request) {
    Claims claims = jwtTokenService.parse(request.refreshToken());
    if (!"refresh".equals(claims.get("typ", String.class))) {
      throw new OperationException(
          HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }

    String refreshJti = claims.get("jti", String.class);
    AuthSession current =
        authSessionPort
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

    String incomingHash = passwordHashService.sha256(request.refreshToken());
    if (!incomingHash.equals(current.getRefreshTokenHash())) {
      current.setActive(false);
      current.setRevokedAt(OffsetDateTime.now());
      authSessionPort.save(current);
      throw new OperationException(
          HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }

    current.setActive(false);
    current.setRevokedAt(OffsetDateTime.now());
    authSessionPort.save(current);

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
    rotated = authSessionPort.save(rotated);

    String refreshToken =
        jwtTokenService.createRefreshToken(user.getId(), rotated.getId(), rotated.getRefreshJti());
    rotated.setRefreshTokenHash(passwordHashService.sha256(refreshToken));
    rotated.setLastSeenAt(OffsetDateTime.now());
    rotated = authSessionPort.save(rotated);

    String accessToken =
        jwtTokenService.createAccessToken(
            user.getId(), user.getCompanyId(), rotated.getId(), user.getEmail(), RolePermissions.claims(user.getRole()));

    authAuditService.log(
        AuthAuditAction.REFRESH,
        user,
        device,
        "OK",
        Map.of("sessionId", rotated.getId().toString()));

    return new LoginResponse(
        accessToken,
        refreshToken,
        "Bearer",
        responseAssembler.toUser(user),
        responseAssembler.toSession(rotated),
        responseAssembler.toDevice(device),
        responseAssembler.offlineLease(rotated, null, defaultOfflineLeaseHours));
  }

  @Override
  @Transactional
  public void logout(LogoutRequest request) {
    UUID sessionId = Objects.requireNonNull(UUID.fromString(request.sessionId()));
    AuthSession session =
        authSessionPort
            .findById(sessionId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion no encontrada"));

    session.setActive(false);
    session.setRevokedAt(OffsetDateTime.now());
    authSessionPort.save(session);

    authAuditService.log(
        AuthAuditAction.LOGOUT,
        session.getUser(),
        session.getDevice(),
        "OK",
        Map.of("sessionId", request.sessionId()));

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.LOGOUT,
        session.getUser(),
        "Session active",
        "Session revoked",
        "Session ID: " + request.sessionId());
  }

  @Override
  @Transactional(readOnly = true)
  public AuthUserResponse me() {
    UUID userId = SecurityUtils.requireUserId();
    AppUser user =
        appUserRepository
            .findById(userId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    return responseAssembler.toUser(user);
  }

  @Override
  @Transactional
  public void changePassword(ChangePasswordRequest request) {
    UUID userId = SecurityUtils.requireUserId();
    AppUser user =
        appUserRepository
            .findById(userId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

    log.info("AUTH: Password change attempt - userId={}, email={}", user.getId(), maskEmail(user.getEmail()));

    if (!passwordHashService.matchesPassword(request.currentPassword(), user.getPasswordHash())) {
      log.warn("AUTH: Password change failed - current password invalid - userId={}", user.getId());
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contrasena actual invalida");
    }

    validatePasswordStrength(request.newPassword());

    user.setPasswordHash(passwordHashService.encodePassword(request.newPassword()));
    user.setPasswordChangedAt(OffsetDateTime.now());
    appUserRepository.save(user);

    int sessionsRevoked = 0;
    for (AuthSession session : authSessionPort.findByUserAndActiveTrue(user)) {
      session.setActive(false);
      session.setRevokedAt(OffsetDateTime.now());
      authSessionPort.save(session);
      sessionsRevoked++;
    }

    log.info("AUTH: Password changed successfully - userId={}, sessionsRevoked={}", user.getId(), sessionsRevoked);
    authAuditService.log(AuthAuditAction.PASSWORD_CHANGED, user, null, "OK",
        Map.of("sessionsRevoked", sessionsRevoked));
  }

  private void validatePasswordStrength(String password) {
    if (password == null || password.length() < 8) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La contraseña debe tener al menos 8 caracteres");
    }

    if (!PASSWORD_PATTERN.matcher(password).matches()) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial (@#$%^&+=!.))");
    }
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

  private OperationException invalidCredentials(String email, String deviceId) {
    authAuditService.log(
        AuthAuditAction.LOGIN_FAILED,
        null,
        null,
        "DENY_INVALID_CREDENTIALS",
        Map.of("email", email, "deviceId", deviceId));
    return new OperationException(
        HttpStatus.UNAUTHORIZED, "AUTH_INVALID_CREDENTIALS", "Credenciales invalidas");
  }

  private AuthorizedDevice upsertDevice(LoginRequest request) {
    AuthorizedDevice device =
        authorizedDevicePort.findByDeviceId(request.deviceId()).orElseGet(AuthorizedDevice::new);
    device.setDeviceId(request.deviceId());
    device.setDisplayName(request.deviceName());
    device.setPlatform(request.platform());
    device.setFingerprint(request.fingerprint());
    device.setLastSeenAt(OffsetDateTime.now());
    if (device.getId() == null) {
      device.setAuthorized(true);
    }
    return authorizedDevicePort.save(device);
  }

}
