package com.parkflow.modules.cash.application.port.in;

import com.parkflow.modules.cash.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * @deprecated This is a facade interface that bundles multiple use cases.
 *             Use the specific use case interfaces instead:
 *             <ul>
 *               <li>{@link CashSessionManagementUseCase} for open/close/submitCount
 *               <li>{@link CashSessionQueryUseCase} for getSession/getCurrent/listSessions
 *               <li>{@link CashSessionAuditUseCase} for getSummary/getAuditTrail
 *             </ul>
 *             This interface will be removed in a future release.
 */
@Deprecated(since = "2.0.0", forRemoval = true)
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
