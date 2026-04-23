package com.parkflow.modules.tickets.repository;

import com.parkflow.modules.tickets.entity.PrintDocumentType;
import com.parkflow.modules.tickets.entity.PrintJob;
import com.parkflow.modules.tickets.entity.PrintJobStatus;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrintJobRepository extends JpaRepository<PrintJob, UUID> {
  Optional<PrintJob> findByIdempotencyKey(String idempotencyKey);

  List<PrintJob> findBySession_IdOrderByCreatedAtDesc(UUID sessionId);

  List<PrintJob> findBySession_TicketNumberOrderByCreatedAtDesc(String ticketNumber);

  List<PrintJob> findByStatusOrderByCreatedAtAsc(PrintJobStatus status);

  boolean existsBySession_IdAndDocumentTypeAndStatusIn(
      UUID sessionId, PrintDocumentType documentType, Collection<PrintJobStatus> statuses);

  long countByStatusInAndCreatedAtAfter(Collection<PrintJobStatus> statuses, OffsetDateTime from);
}
