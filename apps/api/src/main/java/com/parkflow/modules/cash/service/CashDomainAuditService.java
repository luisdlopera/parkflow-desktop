package com.parkflow.modules.cash.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.domain.CashAuditLog;
import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.repository.CashAuditLogPort;
import com.parkflow.modules.cash.support.CashHttpContext;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CashDomainAuditService {
  private final CashAuditLogPort cashAuditLogPort;
  private final AppUserPort appUserPort;
  private final ObjectMapper objectMapper;

  @Transactional
  public void log(
      CashSession session,
      CashMovement movement,
      String action,
      String oldValue,
      String newValue,
      String reason,
      Map<String, Object> metadata) {
    UUID uid = SecurityUtils.requireUserId();
    AppUser actor = appUserPort.findById(uid).orElse(null);
    CashAuditLog row = new CashAuditLog();
    row.setCashSession(session);
    row.setCashMovement(movement);
    row.setAction(action);
    row.setActorUser(actor);
    row.setTerminalId(CashHttpContext.currentTerminal().orElse(null));
    row.setClientIp(CashHttpContext.clientIp().orElse(null));
    row.setOldValue(oldValue);
    row.setNewValue(newValue);
    row.setReason(reason);
    if (metadata != null && !metadata.isEmpty()) {
      try {
        row.setMetadata(objectMapper.writeValueAsString(metadata));
      } catch (JsonProcessingException e) {
        row.setMetadata("{}");
      }
    }
    cashAuditLogPort.save(row);
  }
}
