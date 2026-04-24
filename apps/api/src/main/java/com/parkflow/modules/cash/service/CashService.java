package com.parkflow.modules.cash.service;

import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.service.AuthAuditService;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.*;
import com.parkflow.modules.cash.repository.*;
import com.parkflow.modules.cash.support.CashHttpContext;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class CashService {

  private static final BigDecimal ZERO = new BigDecimal("0.00");
  private static final BigDecimal MAX_CASHIER_ADJUST = new BigDecimal("500000.00");

  private final CashRegisterRepository cashRegisterRepository;
  private final CashSessionRepository cashSessionRepository;
  private final CashMovementRepository cashMovementRepository;
  private final CashClosingReportRepository cashClosingReportRepository;
  private final CashAuditLogRepository cashAuditLogRepository;
  private final AppUserRepository appUserRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final CashDomainAuditService cashDomainAuditService;
  private final AuthAuditService authAuditService;
  private final CashPolicyResolver cashPolicyResolver;

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
    authAudit(
        AuthAuditAction.CASH_SESSION_OPEN,
        operator,
        "opened",
        meta);
    cashDomainAuditService.log(
        session,
        null,
        "OPEN",
        null,
        session.getOpeningAmount().toPlainString(),
        null,
        meta);

    return toSessionResponse(session);
  }

  @Transactional(readOnly = true)
  public CashPolicyResponse policy(String siteParam) {
    return cashPolicyResolver.resolvePolicy(StringUtils.hasText(siteParam) ? siteParam.trim() : null);
  }

  @Transactional(readOnly = true)
  public List<CashRegisterInfoResponse> listRegisters(String siteParam) {
    String site = normalizeSite(siteParam != null ? siteParam : "default");
    return cashRegisterRepository.findBySiteOrderByTerminalAsc(site).stream()
        .map(r -> new CashRegisterInfoResponse(r.getId(), r.getSite(), r.getTerminal(), r.getLabel()))
        .toList();
  }

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

  @Transactional(readOnly = true)
  public Page<CashSessionResponse> listSessions(Pageable pageable) {
    return cashSessionRepository.findAllByOrderByOpenedAtDesc(pageable).map(this::toSessionResponse);
  }

  @Transactional(readOnly = true)
  public CashSessionResponse getSession(UUID id) {
    return toSessionResponse(requireSession(id));
  }

  @Transactional(readOnly = true)
  public List<CashMovementResponse> listMovements(UUID sessionId) {
    requireSession(sessionId);
    return cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(sessionId).stream()
        .map(this::toMovementResponse)
        .toList();
  }

  @Transactional
  public CashMovementResponse addMovement(UUID sessionId, CashMovementRequest request) {
    CashSession session = requireOpenSession(sessionId);
    if (request.type() == CashMovementType.PARKING_PAYMENT
        || request.type() == CashMovementType.VOID_OFFSET) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Tipo de movimiento no permitido en API");
    }
    if ((request.type() == CashMovementType.DISCOUNT
            || request.type() == CashMovementType.MANUAL_EXPENSE
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

  @Transactional(readOnly = true)
  public CashSummaryResponse summary(UUID sessionId) {
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

    CashSummaryResponse sum = summary(sessionId);
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
    CashSummaryResponse sum = summary(sessionId);
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
    if (StringUtils.hasText(request.closeIdempotencyKey())) {
      session.setCloseIdempotencyKey(request.closeIdempotencyKey().trim());
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

    return toSessionResponse(session);
  }

  @Transactional(readOnly = true)
  public CashClosingPrintResponse printClosing(UUID sessionId) {
    CashSession session = requireSession(sessionId);
    if (session.getStatus() != CashSessionStatus.CLOSED) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Solo se imprime comprobante de caja cerrada");
    }
    AppUser actor =
        appUserRepository
            .findById(SecurityUtils.requireUserId())
            .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
    CashSummaryResponse sum = summary(sessionId);
    List<String> lines = buildClosingPreviewLines(session, sum);
    Map<String, Object> ticket = new LinkedHashMap<>();
    ticket.put("ticketId", session.getId().toString());
    ticket.put("templateVersion", "ticket-layout-v1");
    ticket.put("paperWidthMm", 58);
    ticket.put("ticketNumber", "CIERRE-" + session.getId().toString().substring(0, 8));
    ticket.put("parkingName", "Parkflow");
    ticket.put("plate", "CAJA");
    ticket.put("vehicleType", "OTHER");
    ticket.put("site", session.getCashRegister().getSite());
    ticket.put("lane", null);
    ticket.put("booth", null);
    ticket.put("terminal", session.getCashRegister().getTerminal());
    ticket.put(
        "operatorName",
        session.getClosedBy() != null ? session.getClosedBy().getName() : session.getOperator().getName());
    ticket.put("issuedAtIso", OffsetDateTime.now().toString());
    ticket.put("legalMessage", null);
    ticket.put("qrPayload", null);
    ticket.put("barcodePayload", session.getId().toString());
    ticket.put("copyNumber", 1);
    ticket.put("detailLines", lines);

    Map<String, Object> meta = baseMeta(session);
    authAudit(AuthAuditAction.CASH_CLOSING_PRINT, actor, "printed", meta);
    cashDomainAuditService.log(session, null, "CLOSING_PRINT", null, session.getId().toString(), null, meta);

    return new CashClosingPrintResponse("CASH_CLOSING", ticket, lines);
  }

  @Transactional(readOnly = true)
  public List<CashAuditEntryResponse> auditTrail(UUID sessionId) {
    requireSession(sessionId);
    return cashAuditLogRepository.findByCashSession_IdOrderByCreatedAtDesc(sessionId).stream()
        .map(
            a ->
                new CashAuditEntryResponse(
                    a.getId(),
                    a.getAction(),
                    a.getActorUser() != null ? a.getActorUser().getId() : null,
                    a.getTerminalId(),
                    a.getClientIp(),
                    a.getOldValue(),
                    a.getNewValue(),
                    a.getReason(),
                    a.getMetadata(),
                    a.getCreatedAt()))
        .collect(Collectors.toList());
  }

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

  private static String policySiteLabel(ParkingSession parkingSession) {
    if (StringUtils.hasText(parkingSession.getSite())) {
      return parkingSession.getSite().trim();
    }
    return null;
  }

  private static boolean offlineCappedMovement(CashMovementType t) {
    return t == CashMovementType.MANUAL_INCOME
        || t == CashMovementType.MANUAL_EXPENSE
        || t == CashMovementType.DISCOUNT
        || t == CashMovementType.ADJUSTMENT
        || t == CashMovementType.REPRINT_FEE;
  }

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
      case MANUAL_EXPENSE, DISCOUNT -> m.getAmount().negate();
      case VOID_OFFSET -> m.getAmount();
    };
  }

  private CashSessionResponse toSessionResponse(CashSession s) {
    CashRegister r = s.getCashRegister();
    return new CashSessionResponse(
        s.getId(),
        new CashRegisterInfoResponse(r.getId(), r.getSite(), r.getTerminal(), r.getLabel()),
        s.getOperator().getId(),
        s.getStatus().name(),
        s.getOpeningAmount(),
        s.getOpenedAt(),
        s.getClosedAt(),
        s.getClosedBy() != null ? s.getClosedBy().getId() : null,
        s.getExpectedAmount(),
        s.getCountedAmount(),
        s.getDifferenceAmount(),
        s.getCountCash(),
        s.getCountCard(),
        s.getCountTransfer(),
        s.getCountOther(),
        s.getNotes(),
        s.getClosingNotes(),
        s.getCountedAt(),
        s.getCountOperator() != null ? s.getCountOperator().getId() : null);
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
        m.getCreatedBy().getId(),
        m.getCreatedAt(),
        m.getTerminal(),
        m.getIdempotencyKey());
  }

  private Map<String, Object> baseMeta(CashSession session) {
    Map<String, Object> meta = new HashMap<>();
    meta.put("cashSessionId", session.getId().toString());
    meta.put(
        "register",
        session.getCashRegister().getSite() + "/" + session.getCashRegister().getTerminal());
    CashHttpContext.currentTerminal().ifPresent(t -> meta.put("terminalHeader", t));
    return meta;
  }

  private void authAudit(AuthAuditAction action, AppUser user, String outcome, Map<String, Object> metadata) {
    authAuditService.log(action, user, null, outcome, metadata);
  }

  private List<String> buildClosingPreviewLines(CashSession session, CashSummaryResponse sum) {
    List<String> lines = new ArrayList<>();
    lines.add("CIERRE DE CAJA");
    lines.add("Sede: " + session.getCashRegister().getSite());
    lines.add("Terminal: " + session.getCashRegister().getTerminal());
    lines.add("Sesion: " + session.getId());
    lines.add("Apertura: " + sum.openingAmount());
    lines.add("Esperado: " + sum.expectedLedgerTotal());
    lines.add("Contado: " + (session.getCountedAmount() != null ? session.getCountedAmount() : ZERO));
    lines.add("Diferencia: " + (session.getDifferenceAmount() != null ? session.getDifferenceAmount() : ZERO));
    lines.add("Cerrado: " + (session.getClosedAt() != null ? session.getClosedAt().toString() : ""));
    return lines;
  }

  private String mergeNotes(String existing, String extra) {
    if (!StringUtils.hasText(extra)) {
      return existing;
    }
    if (!StringUtils.hasText(existing)) {
      return extra;
    }
    return existing + "\n---\n" + extra;
  }
}
