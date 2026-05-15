package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;
import com.parkflow.modules.cash.domain.repository.CashMovementPort;
import com.parkflow.modules.cash.domain.repository.CashRegisterPort;
import com.parkflow.modules.cash.domain.repository.CashSessionPort;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.cash.support.CashHttpContext;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.cash.domain.exception.CashSessionException;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashMovementManagementService implements CashMovementUseCase {

    private static final BigDecimal MAX_CASHIER_ADJUST = new BigDecimal("500000.00");

    private final CashMovementPort cashMovementPort;
    private final CashSessionPort cashSessionPort;
    private final CashRegisterPort cashRegisterPort;
    private final AppUserPort appUserPort;
    private final ParkingSessionPort parkingSessionPort;
    private final CashDomainAuditService cashDomainAuditService;
    private final AuthAuditService authAuditService;
    private final CashPolicyResolver cashPolicyResolver;
    private final CashMovementResponseMapper responseMapper;

    @Override
    @Transactional
    public CashMovementResponse addMovement(UUID sessionId, CashMovementRequest request) {
        CashSession session = requireOpenSession(sessionId);
        if (request.type() == CashMovementType.PARKING_PAYMENT
            || request.type() == CashMovementType.VOID_OFFSET) {
            throw new CashSessionException(HttpStatus.BAD_REQUEST, "Tipo de movimiento no permitido en API");
        }
        if ((request.type() == CashMovementType.DISCOUNT
                || request.type() == CashMovementType.MANUAL_EXPENSE
                || request.type() == CashMovementType.WITHDRAWAL
                || request.type() == CashMovementType.CUSTOMER_REFUND
                || request.type() == CashMovementType.ADJUSTMENT)
            && !StringUtils.hasText(request.reason())) {
            throw new CashSessionException(HttpStatus.BAD_REQUEST, "Motivo obligatorio para este movimiento");
        }
        if (request.type() == CashMovementType.ADJUSTMENT) {
            UserRole role = SecurityUtils.requireUserRole();
            if (request.amount().compareTo(MAX_CASHIER_ADJUST) > 0
                && role != UserRole.ADMIN
                && role != UserRole.SUPER_ADMIN) {
                throw new CashSessionException(
                    HttpStatus.FORBIDDEN, "Ajuste elevado: requiere perfil administrador");
            }
        }

        if (CashHttpContext.offlineClientFlag()) {
            BigDecimal max =
                cashPolicyResolver.offlineMaxManualMovement(session.getCashRegister().getSite());
            if (offlineCappedMovement(request.type())
                && request.amount().compareTo(max) > 0) {
                throw new CashSessionException(
                    HttpStatus.FORBIDDEN,
                    "Monto supera tope para movimientos manuales en modo offline (" + max + ")");
            }
        }

        if (StringUtils.hasText(request.idempotencyKey())) {
            Optional<CashMovement> ex = cashMovementPort.findByIdempotencyKey(request.idempotencyKey().trim());
            if (ex.isPresent()) {
                if (!ex.get().getCashSession().getId().equals(sessionId)) {
                    throw new CashSessionException(HttpStatus.CONFLICT, "Idempotency key ya usada en otra sesion");
                }
                return responseMapper.toMovementResponse(ex.get());
            }
        }

        AppUser actor =
            appUserPort
                .findById(SecurityUtils.requireUserId())
                .orElseThrow(() -> new CashSessionException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (request.type() == CashMovementType.REPRINT_FEE && !StringUtils.hasText(request.reason())) {
            throw new CashSessionException(HttpStatus.BAD_REQUEST, "Motivo obligatorio para cobro de reimpresion");
        }

        CashMovement m = new CashMovement();
        m.setCashSession(session);
        m.setMovementType(request.type());
        m.setPaymentMethod(request.paymentMethod());
        m.setAmount(request.amount().setScale(2, RoundingMode.HALF_UP));
        m.setReason(request.reason());
        m.setMetadata(request.metadataJson());
        m.setExternalReference(request.externalReference());
        m.setCreatedBy(actor);
        m.setTerminal(CashHttpContext.currentTerminal().orElse(session.getCashRegister().getTerminal()));
        if (StringUtils.hasText(request.idempotencyKey())) {
            m.setIdempotencyKey(request.idempotencyKey().trim());
        }
        if (request.parkingSessionId() != null) {
            ParkingSession ps =
                parkingSessionPort
                    .findById(request.parkingSessionId())
                    .orElseThrow(() -> new CashSessionException(HttpStatus.NOT_FOUND, "Sesion no encontrada"));
            m.setParkingSession(ps);
        }
        try {
            m = cashMovementPort.save(m);
        } catch (DataIntegrityViolationException ex) {
            throw new CashSessionException(HttpStatus.CONFLICT, "Movimiento duplicado o conflicto de concurrencia");
        }

        Map<String, Object> meta = responseMapper.baseMeta(session);
        meta.put("movementId", m.getId().toString());
        meta.put("movementType", m.getMovementType().name());
        authAudit(AuthAuditAction.CASH_MOVEMENT_POST, actor, "posted", meta);
        cashDomainAuditService.log(
            session, m, "MOVEMENT_POST", null, m.getAmount().toPlainString(), m.getReason(), meta);

        return responseMapper.toMovementResponse(m);
    }

    @Override
    @Transactional
    public CashMovementResponse voidMovement(UUID sessionId, UUID movementId, VoidMovementRequest request) {
        CashSession session = requireOpenSession(sessionId);
        CashMovement m =
            cashMovementPort
                .findById(movementId)
                .orElseThrow(() -> new CashSessionException(HttpStatus.NOT_FOUND, "Movimiento no encontrado"));
        if (!m.getCashSession().getId().equals(sessionId)) {
            throw new CashSessionException(HttpStatus.BAD_REQUEST, "Movimiento no pertenece a la sesion");
        }
        if (m.getStatus() == CashMovementStatus.VOIDED) {
            return responseMapper.toMovementResponse(m);
        }
        if (m.getMovementType() == CashMovementType.VOID_OFFSET) {
            throw new CashSessionException(HttpStatus.BAD_REQUEST, "No se puede anular un movimiento de contrapartida");
        }

        if (StringUtils.hasText(request.idempotencyKey())) {
            String vk = "void:" + movementId + ":" + request.idempotencyKey().trim();
            Optional<CashMovement> existing = cashMovementPort.findByIdempotencyKey(vk);
            if (existing.isPresent()) {
                m.setStatus(CashMovementStatus.VOIDED);
                return responseMapper.toMovementResponse(m);
            }
        }

        AppUser actor =
            appUserPort
                .findById(SecurityUtils.requireUserId())
                .orElseThrow(() -> new CashSessionException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        OffsetDateTime now = OffsetDateTime.now();
        m.setStatus(CashMovementStatus.VOIDED);
        m.setVoidedAt(now);
        m.setVoidReason(request.reason());
        m.setVoidedBy(actor);
        cashMovementPort.save(m);

        CashMovement offset = new CashMovement();
        offset.setCashSession(session);
        offset.setMovementType(CashMovementType.VOID_OFFSET);
        offset.setPaymentMethod(m.getPaymentMethod());
        offset.setAmount(m.getAmount().negate());
        offset.setReason("Anulacion: " + request.reason());
        offset.setMetadata("{\"voidOf\":\"" + m.getId() + "\"}");
        offset.setCreatedBy(actor);
        offset.setTerminal(m.getTerminal());
        if (StringUtils.hasText(request.idempotencyKey())) {
            offset.setIdempotencyKey("void:" + movementId + ":" + request.idempotencyKey().trim());
        }
        cashMovementPort.save(offset);

        Map<String, Object> meta = responseMapper.baseMeta(session);
        meta.put("voidedMovementId", m.getId().toString());
        meta.put("offsetId", offset.getId().toString());
        authAudit(AuthAuditAction.CASH_MOVEMENT_VOID, actor, "voided", meta);
        cashDomainAuditService.log(
            session,
            m,
            "MOVEMENT_VOID",
            m.getAmount().toPlainString(),
            "0",
            request.reason(),
            meta);

        return responseMapper.toMovementResponse(m);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashMovementResponse> listMovements(UUID sessionId) {
        requireSession(sessionId);
        return cashMovementPort.findByCashSession_IdOrderByCreatedAtDesc(sessionId).stream()
            .map(responseMapper::toMovementResponse)
            .toList();
    }

    @Override
    @Transactional
    public void assertCashOpenForParkingPayment(ParkingSession parkingSession) {
        if (!cashPolicyResolver.requireOpenForPayment(policySiteLabel(parkingSession))) {
            return;
        }
        String site = normalizeSite(parkingSession.getSite());
        String terminal = resolveTerminal(parkingSession);
        CashRegister reg =
            cashRegisterPort
                .findBySiteAndTerminal(site, terminal)
                .orElseThrow(
                    () ->
                        new CashSessionException(
                            HttpStatus.CONFLICT, "Debe abrir caja en este terminal antes de cobrar"));
        cashSessionPort
            .findByRegisterAndStatus(reg.getId(), CashSessionStatus.OPEN)
            .orElseThrow(
                () ->
                    new CashSessionException(
                        HttpStatus.CONFLICT, "Debe abrir caja para registrar cobros de parqueo"));
    }

    @Override
    @Transactional
    public void recordParkingPayment(
        ParkingSession parkingSession,
        Payment payment,
        AppUser operator,
        String idempotencyKey,
        CashMovementType movementType) {
        if (payment == null) {
            return;
        }
        if (!cashPolicyResolver.requireOpenForPayment(policySiteLabel(parkingSession))) {
            tryRecordParkingLedger(parkingSession, payment, operator, idempotencyKey, movementType);
            return;
        }
        recordParkingLedgerStrict(parkingSession, payment, operator, idempotencyKey, movementType);
    }

    private void tryRecordParkingLedger(
        ParkingSession parkingSession,
        Payment payment,
        AppUser operator,
        String idempotencyKey,
        CashMovementType movementType) {
        try {
            recordParkingLedgerStrict(parkingSession, payment, operator, idempotencyKey, movementType);
        } catch (CashSessionException ex) {
            if (ex.getStatus() == HttpStatus.CONFLICT) {
                return;
            }
            throw ex;
        }
    }

    private void recordParkingLedgerStrict(
        ParkingSession parkingSession,
        Payment payment,
        AppUser operator,
        String idempotencyKey,
        CashMovementType movementType) {
        String site = normalizeSite(parkingSession.getSite());
        String terminal = resolveTerminal(parkingSession);
        CashRegister reg =
            cashRegisterPort
                .findBySiteAndTerminal(site, terminal)
                .orElseThrow(() -> new CashSessionException(HttpStatus.CONFLICT, "Caja no configurada"));
        CashSession cashSession =
            cashSessionPort
                .findByRegisterAndStatus(reg.getId(), CashSessionStatus.OPEN)
                .orElseThrow(() -> new CashSessionException(HttpStatus.CONFLICT, "No hay caja abierta"));

        String key =
            StringUtils.hasText(idempotencyKey)
                ? "parkpay:" + idempotencyKey.trim()
                : "parkpay:sess:" + parkingSession.getId();
        if (cashMovementPort.findByIdempotencyKey(key).isPresent()) {
            return;
        }

        CashMovement m = new CashMovement();
        m.setCashSession(cashSession);
        m.setMovementType(movementType);
        m.setPaymentMethod(payment.getMethod());
        m.setAmount(payment.getAmount());
        m.setParkingSession(parkingSession);
        m.setCreatedBy(operator);
        m.setTerminal(terminal);
        m.setIdempotencyKey(key);
        try {
            cashMovementPort.save(m);
        } catch (DataIntegrityViolationException ex) {
            throw new CashSessionException(HttpStatus.CONFLICT, "Cobro ya registrado en caja para este ticket");
        }

        Map<String, Object> meta = responseMapper.baseMeta(cashSession);
        meta.put("parkingSessionId", parkingSession.getId().toString());
        cashDomainAuditService.log(
            cashSession,
            m,
            "PARKING_PAYMENT",
            null,
            payment.getAmount().toPlainString(),
            null,
            meta);
    }

    // Helper methods ported from CashService

    private String normalizeSite(String site) {
        if (!StringUtils.hasText(site)) {
            return "default";
        }
        return site.trim();
    }

    private String resolveTerminal(ParkingSession parkingSession) {
        if (StringUtils.hasText(parkingSession.getTerminal())) {
            return parkingSession.getTerminal().trim();
        }
        return CashHttpContext.currentTerminal()
            .orElseThrow(
                () ->
                    new CashSessionException(
                        HttpStatus.BAD_REQUEST,
                        "Defina terminal en la sesion de parqueo o envie header X-Parkflow-Terminal"));
    }

    private static String policySiteLabel(ParkingSession parkingSession) {
        if (StringUtils.hasText(parkingSession.getSite())) {
            return parkingSession.getSite().trim();
        }
        return null;
    }

    private static boolean offlineCappedMovement(CashMovementType t) {
        return t == CashMovementType.MANUAL_INCOME
            || t == CashMovementType.MANUAL_EXPENSE
            || t == CashMovementType.WITHDRAWAL
            || t == CashMovementType.CUSTOMER_REFUND
            || t == CashMovementType.DISCOUNT
            || t == CashMovementType.ADJUSTMENT
            || t == CashMovementType.REPRINT_FEE;
    }

    private CashSession requireSession(UUID id) {
        return cashSessionPort
            .findById(id)
            .orElseThrow(() -> new CashSessionException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));
    }

    private CashSession requireOpenSession(UUID id) {
        CashSession s = requireSession(id);
        if (s.getStatus() != CashSessionStatus.OPEN) {
            throw new CashSessionException(HttpStatus.CONFLICT, "La sesion de caja ya esta cerrada");
        }
        return s;
    }

    private void authAudit(AuthAuditAction action, AppUser user, String detail, Map<String, Object> meta) {
        authAuditService.log(action, user, null, detail, meta);
    }
}
