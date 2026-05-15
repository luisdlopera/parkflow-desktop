package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CashMovementResponseMapper {

  public Map<String, Object> baseMeta(CashSession session) {
    Map<String, Object> meta = new HashMap<>();
    meta.put("sessionId", session.getId().toString());
    meta.put("register", session.getCashRegister().getSite() + "/" + session.getCashRegister().getTerminal());
    return meta;
  }

  public CashMovementResponse toMovementResponse(CashMovement movement) {
    return new CashMovementResponse(
        movement.getId(),
        movement.getCashSession().getId(),
        movement.getMovementType().name(),
        movement.getPaymentMethod().name(),
        movement.getAmount(),
        movement.getParkingSession() != null ? movement.getParkingSession().getId() : null,
        movement.getReason(),
        movement.getMetadata(),
        movement.getStatus().name(),
        movement.getVoidedAt(),
        movement.getVoidReason(),
        movement.getVoidedBy() != null ? movement.getVoidedBy().getId() : null,
        movement.getExternalReference(),
        movement.getCreatedBy() != null ? movement.getCreatedBy().getId() : null,
        movement.getCreatedBy() != null ? movement.getCreatedBy().getName() : null,
        movement.getCreatedAt(),
        movement.getTerminal(),
        movement.getIdempotencyKey());
  }
}
