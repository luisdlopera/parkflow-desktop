package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.application.port.in.DeviceManagementUseCase;
import com.parkflow.modules.auth.dto.DeviceDecisionRequest;
import com.parkflow.modules.auth.dto.DeviceInfoResponse;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.common.exception.OperationException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceManagementService implements DeviceManagementUseCase {

  private final AuthorizedDevicePort authorizedDevicePort;
  private final AuthAuditService authAuditService;

  @Override
  @Transactional(readOnly = true)
  public List<DeviceInfoResponse> listDevices() {
    return authorizedDevicePort.findAll().stream().map(this::toDevice).toList();
  }

  @Override
  @Transactional
  public DeviceInfoResponse revokeDevice(DeviceDecisionRequest request) {
    AuthorizedDevice device =
        authorizedDevicePort
            .findByDeviceId(request.deviceId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Equipo no encontrado"));
    device.setAuthorized(false);
    device.setRevokedAt(OffsetDateTime.now());
    device = authorizedDevicePort.save(device);

    authAuditService.log(
        AuthAuditAction.DEVICE_REVOKED,
        null,
        device,
        "OK",
        Map.of("reason", request.reason() != null ? request.reason() : "Revocado por administrador"));

    return toDevice(device);
  }

  @Override
  @Transactional
  public DeviceInfoResponse authorizeDevice(DeviceDecisionRequest request) {
    AuthorizedDevice device =
        authorizedDevicePort
            .findByDeviceId(request.deviceId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Equipo no encontrado"));
    device.setAuthorized(true);
    device.setRevokedAt(null);
    return toDevice(authorizedDevicePort.save(device));
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
}
