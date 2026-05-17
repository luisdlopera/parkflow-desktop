package com.parkflow.modules.parking.operation.application.listener;

import com.parkflow.modules.parking.operation.application.service.OperationPrintService;
import com.parkflow.modules.parking.operation.domain.event.*;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class PrintSessionListener {

    private final OperationPrintService operationPrintService;

    // Execute asynchronously after the transaction has successfully committed
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSessionCreated(SessionCreatedEvent event) {
        log.debug("Enqueuing print job for session: {}", event.session().getId());
        try {
            operationPrintService.enqueuePrintJob(
                event.session(), 
                event.operator(), 
                PrintDocumentType.ENTRY, 
                "entry"
            );
        } catch (Exception e) {
            log.warn("Print job failed for session {}", event.session().getId(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSessionClosed(SessionClosedEvent event) {
        log.debug("Enqueuing print job for closed session: {}", event.session().getId());
        try {
            operationPrintService.enqueuePrintJob(
                event.session(), 
                event.operator(), 
                PrintDocumentType.EXIT, 
                "exit"
            );
        } catch (Exception e) {
            log.warn("Print job failed for closed session {}", event.session().getId(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSessionLostTicket(SessionLostTicketEvent event) {
        log.debug("Enqueuing print job for lost ticket session: {}", event.session().getId());
        try {
            operationPrintService.enqueuePrintJob(
                event.session(), 
                event.operator(), 
                PrintDocumentType.EXIT, // or maybe a specific type if available
                "lost_ticket"
            );
        } catch (Exception e) {
            log.warn("Print job failed for lost ticket session {}", event.session().getId(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTicketReprinted(TicketReprintedEvent event) {
        log.debug("Enqueuing print job for reprinted ticket: {}", event.session().getId());
        try {
            operationPrintService.enqueuePrintJob(
                event.session(), 
                event.operator(), 
                PrintDocumentType.REPRINT, 
                "reprint-" + event.reprintCount()
            );
        } catch (Exception e) {
            log.warn("Print job failed for reprinted ticket session {}", event.session().getId(), e);
        }
    }
}
