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
 * @deprecated This is a facade service that bundles multiple use cases.
 *             It was created to provide a single access point, but violates
 *             the hexagonal architecture principle of focused use cases.
 *
 *             <p>Use the specific use case interfaces instead:
 *             <ul>
 *               <li>{@link CashSessionManagementUseCase} for open/close/count operations
 *               <li>{@link CashSessionQueryUseCase} for read operations
 *               <li>{@link CashSessionAuditUseCase} for audit trail operations
 *             </ul>
 *
 *             <p>The {@link CashController} already injects these use cases directly,
 *             so clients should follow the same pattern.
 *             This service will be removed in a future release.
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
@Deprecated(since = "2.0.0", forRemoval = true)
@SuppressWarnings("deprecation")
public class CashSessionCompositeService implements CashSessionUseCase {

    private final CashSessionManagementUseCase managementUseCase;
    private final CashSessionQueryUseCase queryUseCase;
    private final CashSessionAuditUseCase auditUseCase;

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public CashSessionResponse open(OpenCashRequest request) {
        return managementUseCase.open(request);
    }

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public CashSessionResponse close(UUID sessionId, CashCloseRequest request) {
        return managementUseCase.close(sessionId, request);
    }

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public CashSessionResponse submitCount(UUID sessionId, CashCountRequest request) {
        return managementUseCase.submitCount(sessionId, request);
    }

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public CashSessionResponse getSession(UUID sessionId) {
        return queryUseCase.getSession(sessionId);
    }

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public CashSessionResponse getCurrent(String site, String terminal) {
        return queryUseCase.getCurrent(site, terminal);
    }

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public Page<CashSessionResponse> listSessions(Pageable pageable) {
        return queryUseCase.listSessions(pageable);
    }

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public CashSummaryResponse getSummary(UUID sessionId) {
        return auditUseCase.getSummary(sessionId);
    }

    @Deprecated(since = "2.0.0", forRemoval = true)
    @Override
    public List<CashAuditEntryResponse> getAuditTrail(UUID sessionId) {
        return auditUseCase.getAuditTrail(sessionId);
    }
}
