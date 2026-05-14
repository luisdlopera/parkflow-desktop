package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.cash.application.port.in.CashSessionUseCase;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.*;
import com.parkflow.modules.cash.repository.*;
import com.parkflow.modules.cash.service.*;
import com.parkflow.modules.cash.support.CashHttpContext;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.service.ParkingParametersService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashSessionManagementService implements CashSessionUseCase {

    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final CashRegisterRepository cashRegisterRepository;
    private final CashSessionRepository cashSessionRepository;
    private final CashMovementRepository cashMovementRepository;
    private final CashClosingReportRepository cashClosingReportRepository;
    private final CashAuditLogRepository cashAuditLogRepository;
    private final AppUserRepository appUserRepository;
    private final CashDomainAuditService cashDomainAuditService;
    private final AuthAuditService authAuditService;
    private final ParkingParametersService parkingParametersService;
    private final CashSequentialSupportService cashSequentialSupportService;
    private final CashClosingOutboundNotifier cashClosingOutboundNotifier;
    private final com.parkflow.modules.audit.service.AuditService globalAuditService;

    @Override
    @Transactional
    public CashSessionResponse open(OpenCashRequest request) {
        validateOperator(request.operatorUserId());
        if (StringUtils.hasText(request.openIdempotencyKey())) {
            Optional<CashSession> existing =
                cashSessionRepository.findByOpenIdempotencyKey(request.openIdempotencyKey().trim());
            if (existing.isPresent()) {
                return toSessionResponse(existing.get());
            }
        }

        String site = normalizeSite(request.site());
        String terminal = request.terminal().trim();
        CashRegister register =
            cashRegisterRepository
                .findBySiteAndTerminal(site, terminal)
                .orElseGet(
                    () -> {
                        CashRegister r = new CashRegister();
                        r.setSite(site);
                        r.setTerminal(terminal);
                        r.setLabel(
                            StringUtils.hasText(request.registerLabel())
                                ? request.registerLabel().trim()
                                : terminal);
                        r.setUpdatedAt(OffsetDateTime.now());
                        return cashRegisterRepository.save(r);
                    });

        cashSessionRepository
            .findByRegisterAndStatus(register.getId(), CashSessionStatus.OPEN)
            .ifPresent(
                s -> {
                    throw new OperationException(
                        HttpStatus.CONFLICT, "Ya existe una caja abierta en esta sede/terminal");
                });

        AppUser operator =
            appUserRepository
                .findById(request.operatorUserId())
                .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
        if (!operator.isActive()) {
            throw new OperationException(HttpStatus.FORBIDDEN, "Operador inactivo");
        }

        CashSession session = new CashSession();
        session.setCashRegister(register);
        session.setOperator(operator);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOpeningAmount(request.openingAmount().setScale(2, RoundingMode.HALF_UP));
        session.setOpenedAt(OffsetDateTime.now());
        session.setNotes(request.notes());
        if (StringUtils.hasText(request.openIdempotencyKey())) {
            session.setOpenIdempotencyKey(request.openIdempotencyKey().trim());
        }
        session.setUpdatedAt(OffsetDateTime.now());
        session = cashSessionRepository.save(session);

        Map<String, Object> meta = baseMeta(session);
        meta.put("openingAmount", session.getOpeningAmount().toPlainString());
        authAudit(AuthAuditAction.CASH_SESSION_OPEN, operator, "opened", meta);
        cashDomainAuditService.log(session, null, "OPEN", null, session.getOpeningAmount().toPlainString(), null, meta);

        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.ABRIR_CAJA,
            operator,
            null,
            "Opening amount: " + session.getOpeningAmount(),
            "Register: " + register.getSite() + "/" + register.getTerminal());

        return toSessionResponse(session);
    }

    @Override
    @Transactional
    public CashSessionResponse submitCount(UUID sessionId, CashCountRequest request) {
        CashSession session = requireOpenSession(sessionId);
        AppUser actor =
            appUserRepository
                .findById(SecurityUtils.requireUserId())
                .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        BigDecimal cCash = request.countCash().setScale(2, RoundingMode.HALF_UP);
        BigDecimal cCard = request.countCard().setScale(2, RoundingMode.HALF_UP);
        BigDecimal cTr = request.countTransfer().setScale(2, RoundingMode.HALF_UP);
        BigDecimal cOther = request.countOther().setScale(2, RoundingMode.HALF_UP);
        BigDecimal counted = cCash.add(cCard).add(cTr).add(cOther);

        CashSummaryResponse sum = getSummary(sessionId);
        BigDecimal diff = counted.subtract(sum.expectedLedgerTotal());

        session.setCountCash(cCash);
        session.setCountCard(cCard);
        session.setCountTransfer(cTr);
        session.setCountOther(cOther);
        session.setCountedAmount(counted);
        session.setExpectedAmount(sum.expectedLedgerTotal());
        session.setDifferenceAmount(diff);
        session.setCountedAt(OffsetDateTime.now());
        session.setCountOperator(actor);
        session.setNotes(mergeNotes(session.getNotes(), request.observations()));
        session.setUpdatedAt(OffsetDateTime.now());
        session = cashSessionRepository.save(session);

        if (diff.compareTo(ZERO) != 0 && !StringUtils.hasText(request.observations())) {
            throw new OperationException(
                HttpStatus.BAD_REQUEST, "Hay diferencia en arqueo; ingrese observaciones obligatorias");
        }

        Map<String, Object> meta = baseMeta(session);
        meta.put("countedTotal", counted.toPlainString());
        meta.put("expected", sum.expectedLedgerTotal().toPlainString());
        meta.put("difference", diff.toPlainString());
        authAudit(AuthAuditAction.CASH_COUNT_SUBMITTED, actor, "counted", meta);
        cashDomainAuditService.log(
            session,
            null,
            "COUNT",
            sum.expectedLedgerTotal().toPlainString(),
            counted.toPlainString(),
            request.observations(),
            meta);

        return toSessionResponse(session);
    }

    @Override
    @Transactional
    public CashSessionResponse close(UUID sessionId, CashCloseRequest request) {
        if (StringUtils.hasText(request.closeIdempotencyKey())) {
            Optional<CashSession> done =
                cashSessionRepository.findByCloseIdempotencyKey(request.closeIdempotencyKey().trim());
            if (done.isPresent() && done.get().getStatus() == CashSessionStatus.CLOSED) {
                return toSessionResponse(done.get());
            }
        }

        CashSession session = requireOpenSession(sessionId);
        if (session.getCountedAt() == null) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "Debe registrar arqueo antes de cerrar");
        }
        CashSummaryResponse sum = getSummary(sessionId);
        BigDecimal diff = session.getDifferenceAmount() != null ? session.getDifferenceAmount() : ZERO;
        if (diff.compareTo(ZERO) != 0 && !StringUtils.hasText(request.closingNotes())) {
            throw new OperationException(
                HttpStatus.BAD_REQUEST, "Hay diferencia; observacion de cierre obligatoria");
        }

        AppUser closer =
            appUserRepository
                .findById(SecurityUtils.requireUserId())
                .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        OffsetDateTime now = OffsetDateTime.now();
        session.setStatus(CashSessionStatus.CLOSED);
        session.setClosedAt(now);
        session.setClosedBy(closer);
        session.setClosingNotes(request.closingNotes());
        if (StringUtils.hasText(request.closingWitnessName())) {
            session.setClosingWitnessName(request.closingWitnessName().trim());
        }
        if (StringUtils.hasText(request.closeIdempotencyKey())) {
            session.setCloseIdempotencyKey(request.closeIdempotencyKey().trim());
        }
        String groupingSite = groupingSiteForParams(session);
        ParkingParametersData siteParamsClosing = parkingParametersService.get(groupingSite);
        String supportDoc =
            cashSequentialSupportService.allocateIfEnabled(
                siteParamsClosing, groupingSite, session.getCashRegister().getTerminal());
        if (StringUtils.hasText(supportDoc)) {
            session.setSupportDocumentNumber(supportDoc);
        }
        session.setUpdatedAt(now);
        session = cashSessionRepository.save(session);

        CashClosingReport report = new CashClosingReport();
        report.setCashSession(session);
        report.setTotalCash(session.getCountCash() != null ? session.getCountCash() : ZERO);
        report.setTotalCard(session.getCountCard() != null ? session.getCountCard() : ZERO);
        report.setTotalTransfer(session.getCountTransfer() != null ? session.getCountTransfer() : ZERO);
        report.setTotalOther(session.getCountOther() != null ? session.getCountOther() : ZERO);
        report.setExpectedTotal(sum.expectedLedgerTotal());
        report.setCountedTotal(session.getCountedAmount() != null ? session.getCountedAmount() : ZERO);
        report.setDifference(diff);
        report.setObservations(request.closingNotes());
        report.setGeneratedBy(closer);
        cashClosingReportRepository.save(report);

        Map<String, Object> meta = baseMeta(session);
        meta.put("expected", sum.expectedLedgerTotal().toPlainString());
        meta.put("counted", report.getCountedTotal().toPlainString());
        authAudit(AuthAuditAction.CASH_SESSION_CLOSE, closer, "closed", meta);
        cashDomainAuditService.log(
            session,
            null,
            "CLOSE",
            sum.expectedLedgerTotal().toPlainString(),
            report.getCountedTotal().toPlainString(),
            request.closingNotes(),
            meta);

        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CERRAR_CAJA,
            closer,
            "Expected: " + sum.expectedLedgerTotal(),
            "Counted: " + report.getCountedTotal() + ", Diff: " + diff,
            "Session: " + session.getId());

        cashClosingOutboundNotifier.scheduleAfterCashClose(session.getId(), groupingSite);

        return toSessionResponse(session);
    }

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
        CashSession session =
            cashSessionRepository
                .findOpenForSiteTerminal(site, terminal, CashSessionStatus.OPEN)
                .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "No hay caja abierta"));
        return toSessionResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CashSessionResponse> listSessions(Pageable pageable) {
        return cashSessionRepository.findAllByOrderByOpenedAtDesc(pageable).map(this::toSessionResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public CashSummaryResponse getSummary(UUID sessionId) {
        CashSession session = requireSession(sessionId);
        List<CashMovement> movements = cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(sessionId);
        BigDecimal ledger =
            movements.stream().map(this::ledgerContribution).reduce(ZERO, BigDecimal::add);
        BigDecimal opening = session.getOpeningAmount() != null ? session.getOpeningAmount() : ZERO;
        BigDecimal expected = opening.add(ledger);

        Map<String, BigDecimal> byMethod = new HashMap<>();
        Map<String, BigDecimal> byType = new HashMap<>();
        long posted = 0;
        for (CashMovement m : movements) {
            if (m.getStatus() != CashMovementStatus.POSTED) {
                continue;
            }
            posted++;
            BigDecimal c = ledgerContribution(m);
            byMethod.merge(m.getPaymentMethod().name(), c, BigDecimal::add);
            byType.merge(m.getMovementType().name(), c, BigDecimal::add);
        }

        BigDecimal counted =
            session.getCountedAmount() != null ? session.getCountedAmount() : null;
        BigDecimal diff =
            counted != null ? counted.subtract(expected) : null;

        return new CashSummaryResponse(
            opening,
            expected,
            counted,
            diff,
            byMethod,
            byType,
            posted);
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

    // Helper methods ported from CashService
    
    private void validateOperator(UUID operatorUserId) {
        UUID actor = SecurityUtils.requireUserId();
        UserRole role = SecurityUtils.requireUserRole();
        if (!operatorUserId.equals(actor)
            && role != UserRole.ADMIN
            && role != UserRole.SUPER_ADMIN) {
            throw new OperationException(HttpStatus.FORBIDDEN, "Solo puede operar caja como su usuario");
        }
    }

    private String normalizeSite(String site) {
        if (!StringUtils.hasText(site)) {
            return "default";
        }
        return site.trim();
    }

    private CashSession requireSession(UUID id) {
        return cashSessionRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));
    }

    private CashSession requireOpenSession(UUID id) {
        CashSession s = requireSession(id);
        if (s.getStatus() != CashSessionStatus.OPEN) {
            throw new OperationException(HttpStatus.CONFLICT, "La sesion de caja ya esta cerrada");
        }
        return s;
    }

    private BigDecimal ledgerContribution(CashMovement m) {
        if (m.getStatus() != CashMovementStatus.POSTED) {
            return ZERO;
        }
        return switch (m.getMovementType()) {
            case PARKING_PAYMENT,
                MANUAL_INCOME,
                LOST_TICKET_PAYMENT,
                REPRINT_FEE,
                ADJUSTMENT -> m.getAmount();
            case MANUAL_EXPENSE, WITHDRAWAL, CUSTOMER_REFUND, DISCOUNT -> m.getAmount().negate();
            case VOID_OFFSET -> m.getAmount();
        };
    }

    private String groupingSiteForParams(CashSession s) {
        if (s.getCashRegister().getSite() != null) return s.getCashRegister().getSite();
        return "default";
    }

    private String mergeNotes(String current, String extra) {
        if (!StringUtils.hasText(extra)) return current;
        if (!StringUtils.hasText(current)) return extra.trim();
        return current + " | Arqueo: " + extra.trim();
    }

    private Map<String, Object> baseMeta(CashSession s) {
        Map<String, Object> m = new HashMap<>();
        m.put("sessionId", s.getId().toString());
        m.put("register", s.getCashRegister().getSite() + "/" + s.getCashRegister().getTerminal());
        return m;
    }

    private void authAudit(AuthAuditAction action, AppUser user, String detail, Map<String, Object> meta) {
        authAuditService.log(action, user, null, detail, meta);
    }

    private CashSessionResponse toSessionResponse(CashSession s) {
        CashRegister r = s.getCashRegister();
        return new CashSessionResponse(
            s.getId(),
            new CashRegisterInfoResponse(r.getId(), r.getSite(), r.getTerminal(), r.getLabel()),
            s.getOperator().getId(),
            s.getOperator().getName(),
            s.getStatus().name(),
            s.getOpeningAmount(),
            s.getOpenedAt(),
            s.getClosedAt(),
            s.getClosedBy() != null ? s.getClosedBy().getId() : null,
            s.getClosedBy() != null ? s.getClosedBy().getName() : null,
            s.getExpectedAmount(),
            s.getCountedAmount(),
            s.getDifferenceAmount(),
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
            s.getCountOperator() != null ? s.getCountOperator().getName() : null);
    }
}
