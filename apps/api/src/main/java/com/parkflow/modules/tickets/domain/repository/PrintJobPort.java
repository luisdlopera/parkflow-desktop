package com.parkflow.modules.tickets.domain.repository;

import com.parkflow.modules.tickets.domain.PrintDocumentType;
import com.parkflow.modules.tickets.domain.PrintJob;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrintJobPort {
    long countByCompanyIdAndStatusInAndCreatedAtBetween(
        UUID companyId, Collection<PrintJobStatus> statuses, OffsetDateTime start, OffsetDateTime end);
    
    long countByCompanyIdAndStatusInAndCreatedAtAfter(
        UUID companyId, Collection<PrintJobStatus> statuses, OffsetDateTime after);

    Optional<PrintJob> findByIdempotencyKeyAndCompanyId(String idempotencyKey, UUID companyId);

    Optional<PrintJob> findByIdAndCompanyId(UUID id, UUID companyId);

    List<PrintJob> findBySession_IdAndCompanyIdOrderByCreatedAtDesc(UUID sessionId, UUID companyId);

    List<PrintJob> findBySession_TicketNumberAndCompanyIdOrderByCreatedAtDesc(String ticketNumber, UUID companyId);

    boolean existsBySession_IdAndDocumentTypeAndCompanyIdAndStatusIn(
        UUID sessionId, PrintDocumentType documentType, UUID companyId, Collection<PrintJobStatus> statuses);

    List<PrintJob> findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(UUID companyId, Collection<PrintJobStatus> statuses);

    PrintJob save(PrintJob job);
    Optional<PrintJob> findById(UUID id);
}
