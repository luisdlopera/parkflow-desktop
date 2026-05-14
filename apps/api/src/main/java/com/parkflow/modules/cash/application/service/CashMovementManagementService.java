package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.cash.support.CashHttpContext;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
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

    private final CashMovementRepository cashMovementRepository;
    private final CashSessionRepository cashSessionRepository;
    private final CashRegisterRepository cashRegisterRepository;
    private final AppUserRepository appUserRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final CashDomainAuditService cashDomainAuditService;
    private final AuthAuditService authAuditService;
    private final CashPolicyResolver cashPolicyResolver;

    @Override
    @Transactional
    public CashMovementResponse addMovement(UUID sessionId, CashMovementRequest request) {
        CashSession session = requireOpenSession(sessionId);
        if (request.type() == CashMovementType.PARKING_PAYMENT
            || request.type() == CashMovementType.VOID_OFFSET) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "Tipo de movimiento no permitido en API");
        }
        if ((request.type() == CashMovementType.DISCOUNT
                || request.type() == CashMovementType.MANUAL_EXPENSE
                || request.type() == CashMovementType.WITHDRAWAL
                || request.type() == CashMovementType.CUSTOMER_REFUND
                || request.type() == CashMovementType.ADJUSTMENT)
            && !StringUtils.hasText(request.reason())) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "Motivo obligatorio para este movimiento");
        }
        if (request.type() == CashMovementType.ADJUSTMENT) {
            UserRole role = SecurityUtils.requireUserRole();
            if (request.amount().compareTo(MAX_CASHIER_ADJUST) > 0
                && role != UserRole.ADMIN
                && role != UserRole.SUPER_ADMIN) {
                throw new OperationException(
                    HttpStatus.FORBIDDEN, "Ajuste elevado: requiere perfil administrador");
            }
        }

        if (CashHttpContext.offlineClientFlag()) {
            BigDecimal max =
                cashPolicyResolver.offlineMaxManualMovement(session.getCashRegister().getSite());
            if (offlineCappedMovement(request.type())
                && request.amount().compareTo(max) > 0) {
                throw new OperationException(
                    HttpStatus.FORBIDDEN,
                    "Monto supera tope para movimientos manuales en modo offline (" + max + ")");
            }
        }

        if (StringUtils.hasText(request.idempotencyKey())) {
            Optional<CashMovement> ex = cashMovementRepository.findByIdempotencyKey(request.idempotencyKey().trim());
            if (ex.isPresent()) {
                if (!ex.get().getCashSession().getId().equals(sessionId)) {
                    throw new OperationException(HttpStatus.CONFLICT, "Idempotency key ya usada en otra sesion");
                }
                return toMovementResponse(ex.get());
            }
        }

        AppUser actor =
            appUserRepository
                .findById(SecurityUtils.requireUserId())
                .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (request.type() == CashMovementType.REPRINT_FEE && !StringUtils.hasText(request.reason())) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "Motivo obligatorio para cobro de reimpresion");
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
                parkingSessionRepository
                    .findById(request.parkingSessionId())
                    .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion no encontrada"));
            m.setParkingSession(ps);
        }
        try {
            m = cashMovementRepository.save(m);
        } catch (DataIntegrityViolationException ex) {
            throw new OperationException(HttpStatus.CONFLICT, "Movimiento duplicado o conflicto de concurrencia");
        }

        Map<String, Object> meta = baseMeta(session);
        meta.put("movementId", m.getId().toString());
        meta.put("movementType", m.getMovementType().name());
        authAudit(AuthAuditAction.CASH_MOVEMENT_POST, actor, "posted", meta);
        cashDomainAuditService.log(
            session, m, "MOVEMENT_POST", null, m.getAmount().toPlainString(), m.getReason(), meta);

        return toMovementResponse(m);
    }

    @Override
    @Transactional
    public CashMovementResponse voidMovement(UUID sessionId, UUID movementId, VoidMovementRequest request) {
        CashSession session = requireOpenSession(sessionId);
        CashMovement m =
            cashMovementRepository
                .findById(movementId)
                .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Movimiento no encontrado"));
        if (!m.getCashSession().getId().equals(sessionId)) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "Movimiento no pertenece a la sesion");
        }
        if (m.getStatus() == CashMovementStatus.VOIDED) {
            return toMovementResponse(m);
        }
        if (m.getMovementType() == CashMovementType.VOID_OFFSET) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "No se puede anular un movimiento de contrapartida");
        }

        if (StringUtils.hasText(request.idempotencyKey())) {
            String vk = "void:" + movementId + ":" + request.idempotencyKey().trim();
            Optional<CashMovement> existing = cashMovementRepository.findByIdempotencyKey(vk);
            if (existing.isPresent()) {
                m.setStatus(CashMovementStatus.VOIDED);
                return toMovementResponse(m);
            }
        }

        AppUser actor =
            appUserRepository
                .findById(SecurityUtils.requireUserId())
                .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        OffsetDateTime now = OffsetDateTime.now();
        m.setStatus(CashMovementStatus.VOIDED);
        m.setVoidedAt(now);
        m.setVoidReason(request.reason());
        m.setVoidedBy(actor);
        cashMovementRepository.save(m);

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
        cashMovementRepository.save(offset);

        Map<String, Object> meta = baseMeta(session);
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

        return toMovementResponse(m);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashMovementResponse> listMovements(UUID sessionId) {
        requireSession(sessionId);
        return cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(sessionId).stream()
            .map(this::toMovementResponse)
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
            cashRegisterRepository
                .findBySiteAndTerminal(site, terminal)
                .orElseThrow(
                    () ->
                        new OperationException(
                            HttpStatus.CONFLICT, "Debe abrir caja en este terminal antes de cobrar"));
        cashSessionRepository
            .findByRegisterAndStatus(reg.getId(), CashSessionStatus.OPEN)
            .orElseThrow(
                () ->
                    new OperationException(
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
        } catch (OperationException ex) {
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
            cashRegisterRepository
                .findBySiteAndTerminal(site, terminal)
                .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "Caja no configurada"));
        CashSession cashSession =
            cashSessionRepository
                .findByRegisterAndStatus(reg.getId(), CashSessionStatus.OPEN)
                .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "No hay caja abierta"));

        String key =
            StringUtils.hasText(idempotencyKey)
                ? "parkpay:" + idempotencyKey.trim()
                : "parkpay:sess:" + parkingSession.getId();
        if (cashMovementRepository.findByIdempotencyKey(key).isPresent()) {
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
            cashMovementRepository.save(m);
        } catch (DataIntegrityViolationException ex) {
            throw new OperationException(HttpStatus.CONFLICT, "Cobro ya registrado en caja para este ticket");
        }

        Map<String, Object> meta = baseMeta(cashSession);
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
                    new OperationException(
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

    private Map<String, Object> baseMeta(CashSession s) {
        Map<String, Object> m = new HashMap<>();
        m.put("sessionId", s.getId().toString());
        m.put("register", s.getCashRegister().getSite() + "/" + s.getCashRegister().getTerminal());
        return m;
    }

    private void authAudit(AuthAuditAction action, AppUser user, String detail, Map<String, Object> meta) {
        authAuditService.log(action, user, null, detail, meta);
    }

    private CashMovementResponse toMovementResponse(CashMovement m) {
        return new CashMovementResponse(
            m.getId(),
            m.getCashSession().getId(),
            m.getMovementType().name(),
            m.getPaymentMethod().name(),
            m.getAmount(),
            m.getParkingSession() != null ? m.getParkingSession().getId() : null,
            m.getReason(),
            m.getMetadata(),
            m.getStatus().name(),
            m.getVoidedAt(),
            m.getVoidReason(),
            m.getVoidedBy() != null ? m.getVoidedBy().getId() : null,
            m.getExternalReference(),
            m.getCreatedBy() != null ? m.getCreatedBy().getId() : null,
            m.getCreatedBy() != null ? m.getCreatedBy().getName() : null,
            m.getCreatedAt(),
            m.getTerminal(),
            m.getIdempotencyKey());
    }
}
