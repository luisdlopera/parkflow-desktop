package com.parkflow.modules.cash.application.usecase;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.application.port.in.GetCashMovementsUseCase;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.common.exception.OperationException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MovementQueryService implements GetCashMovementsUseCase {

  private final CashMovementRepository cashMovementRepository;
  private final CashSessionRepository cashSessionRepository;
  private final CashMovementResponseMapper responseMapper;

  @Override
  @Transactional(readOnly = true)
  @PreAuthorize("hasAuthority('cobros:registrar')")
  public List<CashMovementResponse> listMovements(UUID sessionId) {
    requireSession(sessionId);
    return cashMovementRepository
        .findByCashSessionIdFetchAllOrderByCreatedAtDesc(sessionId)
        .stream()
        .map(responseMapper::toMovementResponse)
        .toList();
  }

  private CashSession requireSession(UUID id) {
    CashSession session = cashSessionRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));
    if (TenantContext.getTenantId() != null && !session.getCompanyId().equals(TenantContext.getTenantId())) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Acceso denegado a esta sesión");
    }
    return session;
  }
}
