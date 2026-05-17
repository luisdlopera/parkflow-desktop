package com.parkflow.modules.parking.operation.application.listener;

import com.parkflow.modules.parking.operation.application.service.OperationAuditService;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.event.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditSessionListener {

    private final OperationAuditService operationAuditService;

    // Use TransactionalEventListener to ensure audit is saved only if the session is committed
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onSessionCreated(SessionCreatedEvent event) {
        log.debug("Auditing creation of session: {}", event.session().getId());
        operationAuditService.recordEvent(
            event.session(), 
            SessionEventType.ENTRY_RECORDED, 
            event.operator(), 
            "Ingreso registrado"
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onSessionClosed(SessionClosedEvent event) {
        log.debug("Auditing closure of session: {}", event.session().getId());
        operationAuditService.recordEvent(
            event.session(), 
            SessionEventType.EXIT_RECORDED, 
            event.operator(), 
            "Salida registrada"
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onSessionLostTicket(SessionLostTicketEvent event) {
        log.debug("Auditing lost ticket for session: {}", event.session().getId());
        operationAuditService.recordEvent(
            event.session(), 
            SessionEventType.LOST_TICKET_MARKED, 
            event.operator(), 
            "Ticket marcado como extraviado: " + event.reason()
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onTicketReprinted(TicketReprintedEvent event) {
        log.debug("Auditing reprint for session: {}", event.session().getId());
        operationAuditService.recordEvent(
            event.session(), 
            SessionEventType.TICKET_REPRINTED, 
            event.operator(), 
            "Ticket reimpreso: " + event.reason()
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onSessionVoided(SessionVoidedEvent event) {
        log.debug("Auditing voiding of session: {}", event.session().getId());
        operationAuditService.recordEvent(
            event.session(), 
            SessionEventType.VOIDED, 
            event.operator(), 
            "Ticket anulado: " + event.reason()
        );
    }
}
