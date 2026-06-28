package com.parkflow.modules.auth.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthAuditLog;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthAuditLogPort;
import com.parkflow.modules.auth.domain.AppUser;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Async;

@Service
@RequiredArgsConstructor
public class AuthAuditService {
  private final AuthAuditLogPort authAuditLogRepository;
  private final SecurityAlertService securityAlertService;
  private final ObjectMapper objectMapper;

  @Async("auditExecutor")
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void log(
      AuthAuditAction action,
      @Nullable AppUser user,
      @Nullable AuthorizedDevice device,
      String outcome,
      Map<String, Object> metadata) {
    AuthAuditLog row = new AuthAuditLog();
    row.setAction(action);
    row.setUser(user);
    row.setDevice(device);
    row.setOutcome(outcome);
    try {
      row.setMetadataJson(objectMapper.writeValueAsString(metadata));
    } catch (Exception ex) {
      row.setMetadataJson("{\"error\":\"metadata_serialize_failed\"}");
    }
    authAuditLogRepository.save(row);

    // Check if we need to alert
    if ("TOKEN_THEFT_DETECTED".equals(outcome) || "DENY_INVALID_CREDENTIALS".equals(outcome) || "DENY_DEVICE_REVOKED".equals(outcome)) {
      if ("TOKEN_THEFT_DETECTED".equals(outcome)) {
        securityAlertService.emitAlert("CRITICAL_THREAT", action, user, device, outcome, metadata);
      } else if (user != null && user.getFailedLoginAttempts() >= 4) {
        // Almost blocked or already blocked
        securityAlertService.emitAlert("MULTIPLE_FAILURES", action, user, device, outcome, metadata);
      } else if ("DENY_DEVICE_REVOKED".equals(outcome)) {
        securityAlertService.emitAlert("REVOKED_DEVICE_USED", action, user, device, outcome, metadata);
      }
    }
  }
}
