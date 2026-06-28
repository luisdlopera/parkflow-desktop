package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.lang.Nullable;
import java.util.Map;

@Slf4j
@Service
public class SecurityAlertService {

  public void emitAlert(
      String alertType,
      AuthAuditAction action,
      @Nullable AppUser user,
      @Nullable AuthorizedDevice device,
      String outcome,
      Map<String, Object> metadata) {
      
      String userId = user != null ? user.getId().toString() : "unknown";
      String email = user != null ? user.getEmail() : "unknown";
      String deviceId = device != null ? device.getDeviceId() : "unknown";
      
      // In a real-world scenario, this would send a message to a webhook, Slack, PagerDuty, etc.
      log.error("[SECURITY_ALERT] Type: {} | Action: {} | User: {} ({}) | Device: {} | Outcome: {} | Metadata: {}",
          alertType, action, userId, email, deviceId, outcome, metadata);
  }
}
