package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.domain.AuthPermission;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.dto.AuthUserResponse;
import com.parkflow.modules.auth.dto.DeviceInfoResponse;
import com.parkflow.modules.auth.dto.OfflineLeaseResponse;
import com.parkflow.modules.auth.dto.SessionInfoResponse;
import com.parkflow.modules.auth.security.RolePermissions;
import com.parkflow.modules.auth.domain.AppUser;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AuthenticationResponseAssembler {

  public AuthUserResponse toUser(AppUser user) {
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

  public SessionInfoResponse toSession(AuthSession session) {
    return new SessionInfoResponse(
        session.getId(),
        session.getUser().getId(),
        session.getDevice().getDeviceId(),
        session.getCreatedAt(),
        session.getAccessExpiresAt(),
        session.getRefreshExpiresAt(),
        session.getLastSeenAt());
  }

  public DeviceInfoResponse toDevice(AuthorizedDevice device) {
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

  public OfflineLeaseResponse offlineLease(AuthSession session, Integer requestedHours, int defaultHours) {
    int hours = requestedHours != null ? Math.max(1, Math.min(requestedHours, 72)) : defaultHours;
    OffsetDateTime expires = OffsetDateTime.now().plusHours(hours);
    List<String> restricted =
        List.of("usuarios:editar", "tarifas:editar", "configuracion:editar", "reportes:leer");
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
