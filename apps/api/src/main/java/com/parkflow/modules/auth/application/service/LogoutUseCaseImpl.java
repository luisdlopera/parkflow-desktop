package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.audit.domain.Auditable;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.application.port.in.LogoutUseCase;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.auth.dto.LogoutRequest;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LogoutUseCaseImpl implements LogoutUseCase {

  private final AuthSessionPort authSessionRepository;
  private final AuthorizedDevicePort authorizedDeviceRepository;
  private final AppUserRepository appUserRepository;
  private final AuthAuditService authAuditService;
  private final AuditPort globalAuditService;

  @Override
  @Transactional
  @Auditable(module = "SEGURIDAD", action = "LOGOUT", entityClass = AuthSession.class)
  public void logout(LogoutRequest request) {
    UUID sessionId = Objects.requireNonNull(UUID.fromString(request.sessionId()));
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

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.LOGOUT,
        session.getUser(),
        "Session active",
        "Session revoked",
        "Session ID: " + request.sessionId());
  }

  @Override
  @Transactional
  @Auditable(module = "SEGURIDAD", action = "LOGOUT_ALL", entityClass = AuthSession.class)
  public void logoutAll() {
    AppUser currentUser = requireCurrentUser();
    List<AuthSession> sessions = authSessionRepository.findByUserAndActiveTrue(currentUser);
    OffsetDateTime now = OffsetDateTime.now();
    int revoked = 0;
    for (AuthSession session : sessions) {
      session.setActive(false);
      session.setRevokedAt(now);
      authSessionRepository.save(session);
      revoked++;
    }
    log.info("AUTH: Logout all sessions - userId={}, sessionsRevoked={}", currentUser.getId(), revoked);
    authAuditService.log(AuthAuditAction.LOGOUT_ALL, currentUser, null, "OK",
        Map.of("sessionsRevoked", revoked));
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.LOGOUT,
        currentUser,
        "All sessions active",
        "All sessions revoked",
        "Sessions revoked: " + revoked);
  }

  @Override
  @Transactional
  @Auditable(module = "SEGURIDAD", action = "LOGOUT_DEVICE", entityClass = AuthorizedDevice.class)
  public void logoutDevice(String deviceId) {
    AppUser currentUser = requireCurrentUser();
    AuthorizedDevice device = authorizedDeviceRepository.findByDeviceId(deviceId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Dispositivo no encontrado"));

    List<AuthSession> sessions = authSessionRepository.findByDeviceAndActiveTrue(device);
    OffsetDateTime now = OffsetDateTime.now();
    int revoked = 0;
    for (AuthSession session : sessions) {
      session.setActive(false);
      session.setRevokedAt(now);
      authSessionRepository.save(session);
      revoked++;
    }

    device.setAuthorized(false);
    device.setRevokedAt(now);
    authorizedDeviceRepository.save(device);

    log.info("AUTH: Logout device - userId={}, deviceId={}, sessionsRevoked={}",
        currentUser.getId(), deviceId, revoked);
    authAuditService.log(AuthAuditAction.LOGOUT_DEVICE, currentUser, device, "OK",
        Map.of("sessionsRevoked", revoked));
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.LOGOUT,
        currentUser,
        "Device sessions active",
        "Device sessions revoked",
        "Device: " + deviceId + ", Sessions revoked: " + revoked);
  }

  private AppUser requireCurrentUser() {
    UUID userId = SecurityUtils.requireUserId();
    return appUserRepository
        .findById(userId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
  }
}
