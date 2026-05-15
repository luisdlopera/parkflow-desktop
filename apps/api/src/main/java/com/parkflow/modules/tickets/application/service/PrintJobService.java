package com.parkflow.modules.tickets.application.service;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.tickets.application.port.in.TicketPrintUseCase;
import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.dto.PrintJobResponse;
import com.parkflow.modules.tickets.dto.RetryPrintJobRequest;
import com.parkflow.modules.tickets.dto.UpdatePrintJobStatusRequest;
import com.parkflow.modules.tickets.domain.PrintAttempt;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import com.parkflow.modules.tickets.domain.PrintJob;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import com.parkflow.modules.tickets.domain.repository.PrintAttemptPort;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PrintJobService implements TicketPrintUseCase {
  private static final Logger log = LoggerFactory.getLogger(PrintJobService.class);

  private final PrintJobPort printJobRepository;
  private final PrintAttemptPort printAttemptRepository;
  private final ParkingSessionPort parkingSessionRepository;
  private final AppUserPort appUserRepository;

  @Transactional
  public PrintJobResponse create(CreatePrintJobRequest request) {
    Objects.requireNonNull(request, "request");
    log.info("PrintJobService.create: idempotencyKey={} sessionId={} documentType={}",
        request.idempotencyKey(), request.sessionId(), request.documentType());
    try {
      return printJobRepository
          .findByIdempotencyKeyAndCompanyId(request.idempotencyKey(), TenantContext.getTenantId())
          .map(this::toResponse)
          .orElseGet(() -> createNew(request));
    } catch (OperationException ex) {
      throw ex;
    } catch (Exception ex) {
      log.error("PrintJobService.create: unexpected error for idempotencyKey={}: {}",
          request.idempotencyKey(), ex.getMessage(), ex);
      throw new OperationException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Error al registrar trabajo de impresion: " + ex.getMessage());
    }
  }

  @Transactional
  public PrintJobResponse updateStatus(UUID id, UpdatePrintJobStatusRequest request) {
    if (printAttemptRepository.findByAttemptKey(request.idempotencyKey()).isPresent()) {
      return get(id);
    }

    PrintJob job =
        printJobRepository
            .findByIdAndCompanyId(id, TenantContext.getTenantId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Print job no encontrado"));

    job.setStatus(request.status());
    job.setUpdatedAt(OffsetDateTime.now());

    if (request.status() == PrintJobStatus.FAILED || request.status() == PrintJobStatus.DEAD_LETTER) {
      job.setAttempts(job.getAttempts() + 1);
      job.setLastError(request.errorMessage());
    }

    job = printJobRepository.save(job);
    registerAttempt(job, request.idempotencyKey(), request.status(), request.errorMessage());
    auditTransition(job, "status_update", request.idempotencyKey(), request.status().name());

    return toResponse(job);
  }

  @Transactional
  public PrintJobResponse retry(UUID id, RetryPrintJobRequest request) {
    if (printAttemptRepository.findByAttemptKey(request.idempotencyKey()).isPresent()) {
      return get(id);
    }

    PrintJob job =
        printJobRepository
            .findByIdAndCompanyId(id, TenantContext.getTenantId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Print job no encontrado"));

    if (!(job.getStatus() == PrintJobStatus.FAILED || job.getStatus() == PrintJobStatus.DEAD_LETTER)) {
      throw new OperationException(HttpStatus.CONFLICT, "Solo se puede reintentar un job fallido");
    }

    job.setStatus(PrintJobStatus.QUEUED);
    job.setUpdatedAt(OffsetDateTime.now());
    job = printJobRepository.save(job);

    registerAttempt(job, request.idempotencyKey(), PrintJobStatus.QUEUED, request.reason());
    auditTransition(job, "retry", request.idempotencyKey(), "queued");

    return toResponse(job);
  }

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

  private PrintJobResponse createNew(CreatePrintJobRequest request) {
    if (request.documentType() == PrintDocumentType.ENTRY) {
      boolean blocked =
          printJobRepository.existsBySession_IdAndDocumentTypeAndCompanyIdAndStatusIn(
              request.sessionId(),
              PrintDocumentType.ENTRY,
              TenantContext.getTenantId(),
              EnumSet.of(
                  PrintJobStatus.CREATED,
                  PrintJobStatus.QUEUED,
                  PrintJobStatus.PROCESSING,
                  PrintJobStatus.SENT,
                  PrintJobStatus.ACKED));
      if (blocked) {
        throw new OperationException(
            HttpStatus.CONFLICT, "Ya existe impresion de entrada activa o confirmada para la sesion");
      }
    }

    ParkingSession session =
        parkingSessionRepository
            .findById(request.sessionId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion no encontrada"));

    AppUser operator =
        appUserRepository
            .findById(request.operatorUserId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));

    PrintJob job = new PrintJob();
    job.setSession(session);
    job.setCreatedByUser(operator);
    job.setDocumentType(request.documentType());
    job.setStatus(PrintJobStatus.QUEUED);
    job.setIdempotencyKey(request.idempotencyKey());
    job.setPayloadHash(request.payloadHash());
    job.setTicketSnapshotJson(request.ticketSnapshotJson());
    job.setTerminalId(request.terminalId());
    job.setCompanyId(TenantContext.getTenantId());
    job.setCreatedAt(OffsetDateTime.now());
    job.setUpdatedAt(OffsetDateTime.now());
    job = printJobRepository.save(job);
    registerAttempt(job, request.idempotencyKey(), PrintJobStatus.QUEUED, null);
    auditTransition(job, "create", request.idempotencyKey(), "queued");

    return toResponse(job);
  }

  private void registerAttempt(
      PrintJob job, String attemptKey, PrintJobStatus status, @Nullable String errorMessage) {
    PrintAttempt attempt = new PrintAttempt();
    attempt.setPrintJob(job);
    attempt.setAttemptKey(attemptKey);
    attempt.setStatus(status);
    attempt.setErrorMessage(errorMessage);
    attempt.setCreatedAt(OffsetDateTime.now());
    printAttemptRepository.save(attempt);
  }

  private void auditTransition(PrintJob job, String action, String attemptKey, String toStatus) {
    PrintJob currentJob = Objects.requireNonNull(job, "job");
    var session = Objects.requireNonNull(currentJob.getSession(), "session");
    String ticketNumber = Objects.requireNonNull(session.getTicketNumber(), "ticketNumber");
    String sessionId = Objects.requireNonNull(session.getId(), "sessionId").toString();
    String printJobId = Objects.requireNonNull(currentJob.getId(), "printJobId").toString();

    String correlationId = MDC.get(com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
    try {
      MDC.put("ticketNumber", ticketNumber);
      MDC.put("sessionId", sessionId);
      MDC.put("printJobId", printJobId);
      log.info(
          "audit print_job action={} attemptKey={} toStatus={} terminalId={} documentType={}",
          action,
          attemptKey,
          toStatus,
          job.getTerminalId(),
          job.getDocumentType());
    } finally {
      MDC.clear();
      if (correlationId != null) {
        MDC.put(com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY, correlationId);
      }
    }
  }

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
