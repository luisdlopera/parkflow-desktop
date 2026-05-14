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
  Optional<PrintJob> findByIdAndCompanyId(UUID id, UUID companyId);

  Optional<PrintJob> findByIdempotencyKeyAndCompanyId(String idempotencyKey, UUID companyId);

  List<PrintJob> findBySession_IdAndCompanyIdOrderByCreatedAtDesc(UUID sessionId, UUID companyId);

  List<PrintJob> findBySession_TicketNumberAndCompanyIdOrderByCreatedAtDesc(
      String ticketNumber, UUID companyId);

  List<PrintJob> findByStatusAndCompanyIdOrderByCreatedAtAsc(
      PrintJobStatus status, UUID companyId);

  boolean existsBySession_IdAndDocumentTypeAndCompanyIdAndStatusIn(
      UUID sessionId, PrintDocumentType documentType, UUID companyId, Collection<PrintJobStatus> statuses);

  long countByCompanyIdAndStatusInAndCreatedAtAfter(
      UUID companyId, Collection<PrintJobStatus> statuses, OffsetDateTime from);

  long countByCompanyIdAndStatusInAndCreatedAtBetween(
      UUID companyId, Collection<PrintJobStatus> statuses, OffsetDateTime start, OffsetDateTime end);

  List<PrintJob> findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(
      UUID companyId, Collection<PrintJobStatus> statuses);

  Optional<PrintJob> findTopByCompanyIdAndStatusOrderByUpdatedAtDesc(
      UUID companyId, PrintJobStatus status);
}
