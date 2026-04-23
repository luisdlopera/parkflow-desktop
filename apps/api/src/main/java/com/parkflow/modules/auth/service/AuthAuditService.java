package com.parkflow.modules.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.entity.AuthAuditLog;
import com.parkflow.modules.auth.entity.AuthorizedDevice;
import com.parkflow.modules.auth.repository.AuthAuditLogRepository;
import com.parkflow.modules.parking.operation.domain.AppUser;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthAuditService {
  private final AuthAuditLogRepository authAuditLogRepository;
  private final ObjectMapper objectMapper;

  public void log(
      AuthAuditAction action,
      AppUser user,
      AuthorizedDevice device,
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
  }
}
