package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.cash.domain.CashAuditLog;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashAuditEntryResponse;
import com.parkflow.modules.cash.dto.CashRegisterInfoResponse;
import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.DenominationDto;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CashSessionResponseMapper {

  public Map<String, Object> baseMeta(CashSession session) {
    Map<String, Object> meta = new HashMap<>();
    meta.put("sessionId", session.getId().toString());
    String siteCode = session.getCashRegister().getSiteRef() != null ? session.getCashRegister().getSiteRef().getCode() : "DEFAULT";
    meta.put("register", siteCode + "/" + session.getCashRegister().getTerminal());
    return meta;
  }

  public CashAuditEntryResponse toAuditEntryResponse(CashAuditLog auditLog) {
    return new CashAuditEntryResponse(
        auditLog.getId(),
        auditLog.getAction(),
        auditLog.getActorUser() != null ? auditLog.getActorUser().getId() : null,
        auditLog.getActorUser() != null ? auditLog.getActorUser().getName() : null,
        auditLog.getTerminalId(),
        auditLog.getClientIp(),
        auditLog.getOldValue(),
        auditLog.getNewValue(),
        auditLog.getReason(),
        auditLog.getMetadata(),
        auditLog.getCreatedAt());
  }

  public CashSessionResponse toSessionResponse(CashSession session) {
    CashRegister register = session.getCashRegister();
    List<DenominationDto> denominations = session.getDenominations().stream()
        .map(d -> new DenominationDto(d.getDenomination(), d.getQuantity()))
        .toList();
    return new CashSessionResponse(
        session.getId(),
        new CashRegisterInfoResponse(
            register.getId(), register.getSiteRef() != null ? register.getSiteRef().getCode() : null, register.getTerminal(), register.getLabel()),
        session.getOperator().getId(),
        session.getOperator().getName(),
        session.getStatus().name(),
        session.getOpeningAmount(),
        session.getOpenedAt(),
        session.getClosedAt(),
        session.getClosedBy() != null ? session.getClosedBy().getId() : null,
        session.getClosedBy() != null ? session.getClosedBy().getName() : null,
        session.getExpectedAmount(),
        session.getCountedAmount(),
        session.getDifferenceAmount(),
        session.getCountCash(),
        session.getCountCard(),
        session.getCountTransfer(),
        session.getCountOther(),
        session.getNotes(),
        session.getClosingNotes(),
        session.getClosingWitnessName(),
        session.getSupportDocumentNumber(),
        session.getCountedAt(),
        session.getCountOperator() != null ? session.getCountOperator().getId() : null,
        session.getCountOperator() != null ? session.getCountOperator().getName() : null,
        denominations.isEmpty() ? null : denominations);
  }
}
