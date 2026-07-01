package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.cash.application.port.in.CashSessionQueryUseCase;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.dto.CashRegisterInfoResponse;
import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.DenominationDto;
import com.parkflow.modules.cash.infrastructure.persistence.CashRegisterRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.cash.support.CashHttpContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashSessionQueryService implements CashSessionQueryUseCase {

    private final CashSessionRepository cashSessionRepository;
    private final CashRegisterRepository cashRegisterRepository;

    @Override
    @Transactional(readOnly = true)
    public CashSessionResponse getSession(UUID sessionId) {
        return toSessionResponse(requireSession(sessionId));
    }

    @Override
    @Transactional(readOnly = true)
    public CashSessionResponse getCurrent(String siteParam, String terminalParam) {
        String site = normalizeSite(siteParam != null ? siteParam : "default");
        String terminal =
            StringUtils.hasText(terminalParam)
                ? terminalParam.trim()
                : CashHttpContext.currentTerminal()
                    .orElseThrow(
                        () ->
                            new OperationException(
                                HttpStatus.BAD_REQUEST,
                                "Indique terminal o envie header X-Parkflow-Terminal"));
        Optional<CashSession> bySiteTerminal =
            cashSessionRepository.findOpenForSiteTerminal(site, terminal, CashSessionStatus.OPEN);
        if (bySiteTerminal.isPresent()) {
            CashSession s = bySiteTerminal.get();
            if (TenantContext.getTenantId() != null && !s.getCompanyId().equals(TenantContext.getTenantId())) {
                throw new OperationException(HttpStatus.NOT_FOUND, "No hay caja abierta");
            }
            return toSessionResponse(s);
        }
        Optional<CashRegister> register = cashRegisterRepository.findBySiteAndTerminal(site, terminal);
        if (register.isPresent()) {
            Optional<CashSession> byRegister =
                cashSessionRepository.findByRegisterAndStatus(register.get().getId(), CashSessionStatus.OPEN);
            if (byRegister.isPresent()) {
                CashSession s = byRegister.get();
                if (TenantContext.getTenantId() != null && !s.getCompanyId().equals(TenantContext.getTenantId())) {
                    throw new OperationException(HttpStatus.NOT_FOUND, "No hay caja abierta");
                }
                return toSessionResponse(s);
            }
        }
        throw new OperationException(HttpStatus.NOT_FOUND, "No hay caja abierta");
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CashSessionResponse> listSessions(Pageable pageable) {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new OperationException(HttpStatus.UNAUTHORIZED, "Contexto de compañía requerido");
        }
        return PageResponse.of(cashSessionRepository.findByCompanyIdOrderByOpenedAtDesc(tenantId, pageable).map(this::toSessionResponse));
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

    private String normalizeSite(String site) {
        if (!StringUtils.hasText(site)) {
            return "default";
        }
        return site.trim();
    }

    private CashSessionResponse toSessionResponse(CashSession s) {
        CashRegisterInfoResponse registerInfo = new CashRegisterInfoResponse(
            s.getCashRegister().getId(),
            s.getCashRegister().getSiteRef() != null ? s.getCashRegister().getSiteRef().getCode() : null,
            s.getCashRegister().getTerminal(),
            s.getCashRegister().getLabel()
        );
        List<DenominationDto> denominations = s.getDenominations().stream()
                .map(d -> new DenominationDto(d.getDenomination(), d.getQuantity()))
                .toList();
        return new CashSessionResponse(
            s.getId(),
            registerInfo,
            s.getOperator().getId(),
            s.getOperator().getName(),
            s.getStatus().name(),
            s.getOpeningAmount(),
            s.getOpenedAt(),
            s.getClosedAt(),
            s.getClosedBy() != null ? s.getClosedBy().getId() : null,
            s.getClosedBy() != null ? s.getClosedBy().getName() : null,
            s.getStatus() == CashSessionStatus.OPEN ? null : s.getExpectedAmount(),
            s.getCountedAmount(),
            s.getStatus() == CashSessionStatus.OPEN ? null : s.getDifferenceAmount(),
            s.getCountCash(),
            s.getCountCard(),
            s.getCountTransfer(),
            s.getCountOther(),
            s.getNotes(),
            s.getClosingNotes(),
            s.getClosingWitnessName(),
            s.getSupportDocumentNumber(),
            s.getCountedAt(),
            s.getCountOperator() != null ? s.getCountOperator().getId() : null,
            s.getCountOperator() != null ? s.getCountOperator().getName() : null,
            denominations.isEmpty() ? null : denominations);
    }
}
