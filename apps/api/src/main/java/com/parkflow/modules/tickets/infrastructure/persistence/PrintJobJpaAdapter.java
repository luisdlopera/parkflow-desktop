package com.parkflow.modules.tickets.infrastructure.persistence;

import com.parkflow.modules.tickets.domain.PrintDocumentType;
import com.parkflow.modules.tickets.domain.PrintJob;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PrintJobJpaAdapter implements PrintJobPort {

    private final PrintJobJpaRepository jpaRepository;

    @Override
    public long countByCompanyIdAndStatusInAndCreatedAtBetween(
            UUID companyId, Collection<PrintJobStatus> statuses, OffsetDateTime start, OffsetDateTime end) {
        return jpaRepository.countByCompanyIdAndStatusInAndCreatedAtBetween(companyId, statuses, start, end);
    }

    @Override
    public long countByCompanyIdAndStatusInAndCreatedAtAfter(
            UUID companyId, Collection<PrintJobStatus> statuses, OffsetDateTime after) {
        return jpaRepository.countByCompanyIdAndStatusInAndCreatedAtAfter(companyId, statuses, after);
    }

    @Override
    public Optional<PrintJob> findByIdempotencyKeyAndCompanyId(String idempotencyKey, UUID companyId) {
        return jpaRepository.findByIdempotencyKeyAndCompanyId(idempotencyKey, companyId);
    }

    @Override
    public Optional<PrintJob> findByIdAndCompanyId(UUID id, UUID companyId) {
        return jpaRepository.findByIdAndCompanyId(id, companyId);
    }

    @Override
    public List<PrintJob> findBySession_IdAndCompanyIdOrderByCreatedAtDesc(UUID sessionId, UUID companyId) {
        return jpaRepository.findBySession_IdAndCompanyIdOrderByCreatedAtDesc(sessionId, companyId);
    }

    @Override
    public List<PrintJob> findBySession_TicketNumberAndCompanyIdOrderByCreatedAtDesc(String ticketNumber, UUID companyId) {
        return jpaRepository.findBySession_TicketNumberAndCompanyIdOrderByCreatedAtDesc(ticketNumber, companyId);
    }

    @Override
    public boolean existsBySession_IdAndDocumentTypeAndCompanyIdAndStatusIn(
            UUID sessionId, PrintDocumentType documentType, UUID companyId, Collection<PrintJobStatus> statuses) {
        return jpaRepository.existsBySession_IdAndDocumentTypeAndCompanyIdAndStatusIn(sessionId, documentType, companyId, statuses);
    }

    @Override
    public List<PrintJob> findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(UUID companyId, Collection<PrintJobStatus> statuses) {
        return jpaRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, statuses);
    }

    @Override
    public PrintJob save(PrintJob job) {
        return jpaRepository.save(job);
    }

    @Override
    public Optional<PrintJob> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Repository
    interface PrintJobJpaRepository extends JpaRepository<PrintJob, UUID> {
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
    }
}
