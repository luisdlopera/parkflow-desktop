package com.parkflow.modules.tickets.application.service;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.tickets.dto.PrintJobResponse;
import com.parkflow.modules.tickets.domain.PrintJob;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Print Job Query - handles retrieval and listing of print jobs.
 * Read-only service for querying print job state.
 */
@Service
@RequiredArgsConstructor
public class PrintJobQueryService {
  private final PrintJobPort printJobRepository;

  @Transactional(readOnly = true)
  public PrintJobResponse get(UUID id) {
    PrintJob job =
        printJobRepository
            .findByIdAndCompanyId(id, TenantContext.getTenantId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Print job no encontrado"));
    return toResponse(job);
  }

  @Transactional(readOnly = true)
  public List<PrintJobResponse> listBySession(UUID sessionId) {
    return printJobRepository.findBySession_IdAndCompanyIdOrderByCreatedAtDesc(sessionId, TenantContext.getTenantId()).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<PrintJobResponse> listByTicket(String ticketNumber) {
    return printJobRepository.findBySession_TicketNumberAndCompanyIdOrderByCreatedAtDesc(ticketNumber, TenantContext.getTenantId()).stream()
        .map(this::toResponse)
        .toList();
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private PrintJobResponse toResponse(PrintJob job) {
    return new PrintJobResponse(
        job.getId(),
        job.getSession().getId(),
        job.getSession().getTicketNumber(),
        job.getDocumentType(),
        job.getStatus(),
        job.getIdempotencyKey(),
        job.getPayloadHash(),
        job.getTerminalId(),
        job.getAttempts(),
        job.getLastError(),
        job.getCreatedAt(),
        job.getUpdatedAt());
  }
}
