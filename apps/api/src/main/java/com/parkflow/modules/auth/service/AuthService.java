package com.parkflow.modules.auth.service;

import com.parkflow.modules.auth.dto.*;
import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.entity.AuthPermission;
import com.parkflow.modules.auth.entity.AuthSession;
import com.parkflow.modules.auth.entity.AuthorizedDevice;
import com.parkflow.modules.auth.repository.AuthSessionRepository;
import com.parkflow.modules.auth.repository.AuthorizedDeviceRepository;
import com.parkflow.modules.auth.security.JwtTokenService;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.RolePermissions;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import io.jsonwebtoken.Claims;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
  private final AppUserRepository appUserRepository;
  private final AuthorizedDeviceRepository authorizedDeviceRepository;
  private final AuthSessionRepository authSessionRepository;
  private final JwtTokenService jwtTokenService;
  private final PasswordHashService passwordHashService;
  private final AuthAuditService authAuditService;

  @Value("${app.security.offline-lease-hours:48}")
  private int defaultOfflineLeaseHours;

  @Transactional
  public LoginResponse login(LoginRequest request) {
    AppUser user =
        appUserRepository
        .findByEmailIgnoreCase(request.email().trim())
            .orElseThrow(() -> invalidCredentials(request.email(), request.deviceId()));

    if (!user.isActive() || user.getPasswordHash() == null) {
      throw invalidCredentials(request.email(), request.deviceId());
    }

    if (!passwordHashService.matchesPassword(request.password(), user.getPasswordHash())) {
      throw invalidCredentials(request.email(), request.deviceId());
    }

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
    session = authSessionRepository.save(session);

    String refreshToken = jwtTokenService.createRefreshToken(user.getId(), session.getId(), session.getRefreshJti());
    session.setRefreshTokenHash(passwordHashService.sha256(refreshToken));
    session = authSessionRepository.save(session);

    String accessToken =
        jwtTokenService.createAccessToken(
            user.getId(), user.getEmail(), RolePermissions.claims(user.getRole()));

    authAuditService.log(
        AuthAuditAction.LOGIN_SUCCESS,
        user,
        device,
        "OK",
        Map.of("sessionId", session.getId().toString()));

    return new LoginResponse(
        accessToken,
        refreshToken,
        "Bearer",
        toUser(user),
        toSession(session),
        toDevice(device),
        offlineLease(session, request.offlineRequestedHours()));
  }

  @Transactional
  public LoginResponse refresh(RefreshRequest request) {
    Claims claims = jwtTokenService.parse(request.refreshToken());
    if (!"refresh".equals(claims.get("typ", String.class))) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Refresh token invalido");
    }

    String refreshJti = claims.get("jti", String.class);
    AuthSession current =
        authSessionRepository
            .findByRefreshJtiAndActiveTrue(refreshJti)
            .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Sesion no encontrada"));

    if (!current.getDevice().getDeviceId().equals(request.deviceId())) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Device mismatch");
    }

    String incomingHash = passwordHashService.sha256(request.refreshToken());
    if (!incomingHash.equals(current.getRefreshTokenHash())) {
      current.setActive(false);
      current.setRevokedAt(OffsetDateTime.now());
      authSessionRepository.save(current);
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Refresh token revocado");
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
            user.getId(), user.getEmail(), RolePermissions.claims(user.getRole()));

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
        toUser(user),
        toSession(rotated),
        toDevice(device),
        offlineLease(rotated, defaultOfflineLeaseHours));
  }

  @Transactional
  public void logout(LogoutRequest request) {
    UUID sessionId = UUID.fromString(request.sessionId());
    AuthSession session =
        authSessionRepository
            .findById(sessionId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion no encontrada"));

    session.setActive(false);
    session.setRevokedAt(OffsetDateTime.now());
    authSessionRepository.save(session);

    authAuditService.log(
        AuthAuditAction.LOGOUT,
        session.getUser(),
        session.getDevice(),
        "OK",
        Map.of("sessionId", request.sessionId()));
  }

  @Transactional(readOnly = true)
  public AuthUserResponse me() {
    UUID userId = SecurityUtils.requireUserId();
    AppUser user =
        appUserRepository
            .findById(userId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    return toUser(user);
  }

  @Transactional
  public void changePassword(ChangePasswordRequest request) {
    UUID userId = SecurityUtils.requireUserId();
    AppUser user =
        appUserRepository
            .findById(userId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

    if (!passwordHashService.matchesPassword(request.currentPassword(), user.getPasswordHash())) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contrasena actual invalida");
    }

    user.setPasswordHash(passwordHashService.encodePassword(request.newPassword()));
    user.setPasswordChangedAt(OffsetDateTime.now());
    appUserRepository.save(user);

    for (AuthSession session : authSessionRepository.findByUserAndActiveTrue(user)) {
      session.setActive(false);
      session.setRevokedAt(OffsetDateTime.now());
      authSessionRepository.save(session);
    }

    authAuditService.log(AuthAuditAction.PASSWORD_CHANGED, user, null, "OK", Map.of());
  }

  @Transactional(readOnly = true)
  public List<DeviceInfoResponse> listDevices() {
    return authorizedDeviceRepository.findAll().stream().map(this::toDevice).toList();
  }

  @Transactional
  public DeviceInfoResponse revokeDevice(DeviceDecisionRequest request) {
    AuthorizedDevice device =
        authorizedDeviceRepository
            .findByDeviceId(request.deviceId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Equipo no encontrado"));
    device.setAuthorized(false);
    device.setRevokedAt(OffsetDateTime.now());
    device = authorizedDeviceRepository.save(device);

    authAuditService.log(
        AuthAuditAction.DEVICE_REVOKED,
        null,
        device,
        "OK",
        Map.of("reason", request.reason()));

    return toDevice(device);
  }

  @Transactional
  public DeviceInfoResponse authorizeDevice(DeviceDecisionRequest request) {
    AuthorizedDevice device =
        authorizedDeviceRepository
            .findByDeviceId(request.deviceId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Equipo no encontrado"));
    device.setAuthorized(true);
    device.setRevokedAt(null);
    return toDevice(authorizedDeviceRepository.save(device));
  }

  private OperationException invalidCredentials(String email, String deviceId) {
    authAuditService.log(
        AuthAuditAction.LOGIN_FAILED,
        null,
        null,
        "DENY_INVALID_CREDENTIALS",
        Map.of("email", email, "deviceId", deviceId));
    return new OperationException(HttpStatus.UNAUTHORIZED, "Credenciales invalidas");
  }

  private AuthorizedDevice upsertDevice(LoginRequest request) {
    AuthorizedDevice device =
        authorizedDeviceRepository.findByDeviceId(request.deviceId()).orElseGet(AuthorizedDevice::new);
    device.setDeviceId(request.deviceId());
    device.setDisplayName(request.deviceName());
    device.setPlatform(request.platform());
    device.setFingerprint(request.fingerprint());
    device.setLastSeenAt(OffsetDateTime.now());
    return authorizedDeviceRepository.save(device);
  }

  private AuthUserResponse toUser(AppUser user) {
    List<String> permissions =
        RolePermissions.permissionsFor(user.getRole()).stream().map(AuthPermission::authority).toList();
    return new AuthUserResponse(
        user.getId(),
        user.getName(),
        user.getEmail(),
        user.getRole().name(),
        permissions,
        user.isActive(),
        user.getPasswordChangedAt());
  }

  private SessionInfoResponse toSession(AuthSession session) {
    return new SessionInfoResponse(
        session.getId(),
        session.getUser().getId(),
        session.getDevice().getDeviceId(),
        session.getCreatedAt(),
        session.getAccessExpiresAt(),
        session.getRefreshExpiresAt(),
        session.getLastSeenAt());
  }

  private DeviceInfoResponse toDevice(AuthorizedDevice device) {
    return new DeviceInfoResponse(
        device.getId(),
        device.getDeviceId(),
        device.getDisplayName(),
        device.getPlatform(),
        device.getFingerprint(),
        device.isAuthorized(),
        device.getRevokedAt(),
        device.getLastSeenAt());
  }

  private OfflineLeaseResponse offlineLease(AuthSession session, Integer requestedHours) {
    int hours = requestedHours != null ? Math.max(1, Math.min(requestedHours, 72)) : defaultOfflineLeaseHours;
    OffsetDateTime expires = OffsetDateTime.now().plusHours(hours);
    List<String> restricted =
        List.of(
            "usuarios:editar",
            "tarifas:editar",
            "configuracion:editar",
            "reportes:leer");
    return new OfflineLeaseResponse(
        session.getId(),
        session.getUser().getId(),
        session.getDevice().getDeviceId(),
        OffsetDateTime.now(),
        expires,
        hours,
        restricted);
  }
}
