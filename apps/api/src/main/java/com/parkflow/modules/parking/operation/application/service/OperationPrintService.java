package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import com.parkflow.modules.tickets.application.service.PrintJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationPrintService {

    private final PrintJobService printJobService;

    public void enqueuePrintJob(ParkingSession session, AppUser operator, PrintDocumentType documentType, String reasonSuffix) {
        // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
        try {
            String idempotencyKey =
                "print-"
                    + documentType.name().toLowerCase(Locale.ROOT)
                    + "-"
                    + session.getId()
                    + "-"
                    + reasonSuffix;

            String payloadHash =
                Integer.toHexString(
                    java.util.Objects.hash(
                        session.getTicketNumber(),
                        session.getEntryAt(),
                        session.getExitAt(),
                        session.getTotalAmount(),
                        session.getReprintCount(),
                        documentType));

            CreatePrintJobRequest printReq = new CreatePrintJobRequest(
                session.getId(),
                operator.getId(),
                documentType,
                idempotencyKey,
                payloadHash,
                null,
                session.getTerminal()
            );
            printJobService.create(printReq);
        } catch (Exception printError) {
            log.warn("RELIABILITY: Print job creation failed for session={}, type={}, source={}. Error: {}",
                session.getId(), documentType, reasonSuffix, printError.getMessage());
        }
    }
}
