package com.parkflow.modules.cash.application.usecase;

import com.parkflow.modules.cash.application.port.in.CashSessionUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionManagementUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionQueryUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionAuditUseCase;
import com.parkflow.modules.cash.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Primary;

import java.util.List;
import java.util.UUID;

/**
 * Composite service that aggregates CashSession use cases for convenient access.
 *
 * <p>This service delegates to specialized use cases:
 * <ul>
 *   <li>{@link CashSessionManagementUseCase} for open/close/count operations
 *   <li>{@link CashSessionQueryUseCase} for read operations
 *   <li>{@link CashSessionAuditUseCase} for audit trail operations
 * </ul>
 *
 * <p>This design allows clients to access all session operations through a single port
 * while maintaining the hexagonal architecture's separation of concerns.
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
public class CashSessionCompositeService implements CashSessionUseCase {

    private final CashSessionManagementUseCase managementUseCase;
    private final CashSessionQueryUseCase queryUseCase;
    private final CashSessionAuditUseCase auditUseCase;

    @Override
    public CashSessionResponse open(OpenCashRequest request) {
        return managementUseCase.open(request);
    }

    @Override
    public CashSessionResponse close(UUID sessionId, CashCloseRequest request) {
        return managementUseCase.close(sessionId, request);
    }

    @Override
    public CashSessionResponse submitCount(UUID sessionId, CashCountRequest request) {
        return managementUseCase.submitCount(sessionId, request);
    }

    @Override
    public CashSessionResponse getSession(UUID sessionId) {
        return queryUseCase.getSession(sessionId);
    }

    @Override
    public CashSessionResponse getCurrent(String site, String terminal) {
        return queryUseCase.getCurrent(site, terminal);
    }

    @Override
    public Page<CashSessionResponse> listSessions(Pageable pageable) {
        return queryUseCase.listSessions(pageable);
    }

    @Override
    public CashSummaryResponse getSummary(UUID sessionId) {
        return auditUseCase.getSummary(sessionId);
    }

    @Override
    public List<CashAuditEntryResponse> getAuditTrail(UUID sessionId) {
        return auditUseCase.getAuditTrail(sessionId);
    }
}
