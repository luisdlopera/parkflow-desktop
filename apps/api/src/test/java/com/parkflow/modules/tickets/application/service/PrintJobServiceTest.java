package com.parkflow.modules.tickets.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.dto.UpdatePrintJobStatusRequest;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import com.parkflow.modules.tickets.domain.PrintJob;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import com.parkflow.modules.tickets.domain.repository.PrintAttemptPort;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.auth.domain.UserRole;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class PrintJobServiceTest {

  @Mock private PrintJobPort printJobRepository;
  @Mock private PrintAttemptPort printAttemptRepository;
  @Mock private ParkingSessionPort parkingSessionRepository;
  @Mock private AppUserPort appUserRepository;

  @InjectMocks private PrintJobService printJobService;

  private UUID companyId;
  private UUID sessionId;
  private UUID operatorId;
  private ParkingSession session;
  private AppUser operator;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    sessionId = UUID.randomUUID();
    operatorId = UUID.randomUUID();
    session = ParkingSession.builder()
        .id(sessionId)
        .ticketNumber("T-A-000001")
        .companyId(companyId)
        .build();
    operator = new AppUser();
    operator.setId(operatorId);
    operator.setCompanyId(companyId);

    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(),
        companyId,
        "operator@test.com",
        UserRole.OPERADOR.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void create_isIdempotentByIdempotencyKey() {
    var key = "pj:test:ENTRY:1";
    var existing = new PrintJob();
    existing.setId(UUID.randomUUID());
    existing.setSession(session);
    existing.setDocumentType(PrintDocumentType.ENTRY);
    existing.setStatus(PrintJobStatus.QUEUED);
    existing.setIdempotencyKey(key);
    existing.setCompanyId(companyId);
    existing.setPayloadHash("abc");
    when(printJobRepository.findByIdempotencyKeyAndCompanyId(eq(key), any())).thenReturn(Optional.of(existing));

    var req =
        new CreatePrintJobRequest(
            sessionId, operatorId, PrintDocumentType.ENTRY, key, "abc", null, "T1");

    var res = printJobService.create(req);

    assertThat(res.idempotencyKey()).isEqualTo(key);
    verify(printJobRepository, never()).save(any());
  }

  @Test
  void create_blocksSecondEntryWhenOneIsActiveOrAcked() {
    var key = "pj:second";
    when(printJobRepository.findByIdempotencyKeyAndCompanyId(eq(key), any())).thenReturn(Optional.empty());
    when(printJobRepository.existsBySession_IdAndDocumentTypeAndCompanyIdAndStatusIn(
            eq(sessionId), eq(PrintDocumentType.ENTRY), any(), any()))
        .thenReturn(true);

    var req =
        new CreatePrintJobRequest(
            sessionId, operatorId, PrintDocumentType.ENTRY, key, "hash", null, null);

    assertThatThrownBy(() -> printJobService.create(req))
        .isInstanceOf(OperationException.class)
        .extracting("status")
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void updateStatus_isIdempotentByAttemptKey() {
    var jobId = UUID.randomUUID();
    var attemptKey = "pa:1:ack:1";
    var job = new PrintJob();
    job.setId(jobId);
    job.setSession(session);
    job.setStatus(PrintJobStatus.SENT);
    job.setIdempotencyKey("create-key");
    job.setPayloadHash("h");
    job.setCompanyId(companyId);
    job.setAttempts(0);
    when(printAttemptRepository.findByAttemptKey(attemptKey))
        .thenReturn(Optional.of(new com.parkflow.modules.tickets.domain.PrintAttempt()));
    when(printJobRepository.findByIdAndCompanyId(eq(jobId), any())).thenReturn(Optional.of(job));

    var res =
        printJobService.updateStatus(
            jobId, new UpdatePrintJobStatusRequest(attemptKey, PrintJobStatus.ACKED, null));

    assertThat(res.status()).isEqualTo(PrintJobStatus.SENT);
    verify(printJobRepository, never()).save(any());
  }

  @Test
  void create_persistsSnapshotAndTerminal() {
    var key = "pj:new";
    when(printJobRepository.findByIdempotencyKeyAndCompanyId(eq(key), any())).thenReturn(Optional.empty());
    when(parkingSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
    when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    when(printJobRepository.save(any()))
        .thenAnswer(
            inv -> {
              PrintJob j = inv.getArgument(0);
              if (j.getId() == null) {
                j.setId(UUID.randomUUID());
              }
              return j;
            });

    var snap = "{\"ticketId\":\"T-A-000001\"}";
    var req =
        new CreatePrintJobRequest(
            sessionId, operatorId, PrintDocumentType.EXIT, key, "hash", snap, "TERM-01");

    printJobService.create(req);

    ArgumentCaptor<PrintJob> captor = ArgumentCaptor.forClass(PrintJob.class);
    verify(printJobRepository).save(captor.capture());
    assertThat(captor.getValue().getTicketSnapshotJson()).isEqualTo(snap);
    assertThat(captor.getValue().getTerminalId()).isEqualTo("TERM-01");
  }
}
