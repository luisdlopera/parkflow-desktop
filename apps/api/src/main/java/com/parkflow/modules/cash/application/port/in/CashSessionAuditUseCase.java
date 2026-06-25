package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.dto.CashAuditEntryResponse;

import java.util.List;
import java.util.UUID;

public interface CashSessionAuditUseCase {
    CashSummaryResponse getSummary(UUID sessionId);
    List<CashAuditEntryResponse> getAuditTrail(UUID sessionId);
}
