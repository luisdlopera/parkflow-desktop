package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CashSessionUseCase {
    CashSessionResponse open(OpenCashRequest request);
    CashSessionResponse close(UUID sessionId, CashCloseRequest request);
    CashSessionResponse submitCount(UUID sessionId, CashCountRequest request);
    CashSessionResponse getSession(UUID sessionId);
    CashSessionResponse getCurrent(String site, String terminal);
    Page<CashSessionResponse> listSessions(Pageable pageable);
    CashSummaryResponse getSummary(UUID sessionId);
    List<CashAuditEntryResponse> getAuditTrail(UUID sessionId);
}
