package com.parkflow.modules.cash.application.usecase;

import com.parkflow.modules.cash.application.port.in.CashSessionAuditUseCase;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashAuditEntryResponse;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.repository.CashAuditLogRepository;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashMovementSummaryProjection;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashSessionAuditService implements CashSessionAuditUseCase {

    private final CashSessionRepository cashSessionRepository;
    private final CashMovementRepository cashMovementRepository;
    private final CashAuditLogRepository cashAuditLogRepository;
    private final com.parkflow.modules.cash.application.usecase.CashLedgerSummaryCalculator cashLedgerSummaryCalculator;

    @Override
    @Transactional(readOnly = true)
    public CashSummaryResponse getSummary(UUID sessionId) {
        CashSession session = requireSession(sessionId);
        CashSummaryResponse response = getInternalSummary(session);

        UserRole role = SecurityUtils.requireUserRole();
        if (session.getCountedAt() == null && role != UserRole.ADMIN && role != UserRole.SUPER_ADMIN) {
            return new CashSummaryResponse(
                response.openingAmount(),
                null, // expectedLedgerTotal oculto para cierre ciego
                response.countedTotal(),
                null, // difference oculto
                response.totalsByPaymentMethod(),
                response.totalsByMovementType(),
                response.movementCount()
            );
        }
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashAuditEntryResponse> getAuditTrail(UUID sessionId) {
        requireSession(sessionId);
        return cashAuditLogRepository.findByCashSession_IdOrderByCreatedAtDesc(sessionId).stream()
            .map(
                a ->
                    new CashAuditEntryResponse(
                        a.getId(),
                        a.getAction(),
                        a.getActorUser() != null ? a.getActorUser().getId() : null,
                        a.getActorUser() != null ? a.getActorUser().getName() : null,
                        a.getTerminalId(),
                        a.getClientIp(),
                        a.getOldValue(),
                        a.getNewValue(),
                        a.getReason(),
                        a.getMetadata(),
                        a.getCreatedAt()))
            .collect(Collectors.toList());
    }

    private CashSummaryResponse getInternalSummary(CashSession session) {
        List<CashMovementSummaryProjection> projections =
            cashMovementRepository.getSummaryBySessionId(session.getId());
        return cashLedgerSummaryCalculator.summarize(session, projections);
    }

    private CashSession requireSession(UUID id) {
        CashSession session = cashSessionRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));

        if (TenantContext.getTenantId() != null && !session.getCompanyId().equals(TenantContext.getTenantId())) {
            throw new OperationException(HttpStatus.FORBIDDEN, "Acceso denegado a esta sesión");
        }
        return session;
    }
}
