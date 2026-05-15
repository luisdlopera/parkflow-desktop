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

@Service
@RequiredArgsConstructor
public class AuthAuditService {
  private final AuthAuditLogPort authAuditLogPort;
  private final ObjectMapper objectMapper;

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
    authAuditLogPort.save(row);
  }
}
