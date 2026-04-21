package com.parkflow.modules.tickets.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.dto.UpdatePrintJobStatusRequest;
import com.parkflow.modules.tickets.entity.PrintDocumentType;
import com.parkflow.modules.tickets.entity.PrintJob;
import com.parkflow.modules.tickets.entity.PrintJobStatus;
import com.parkflow.modules.tickets.repository.PrintAttemptRepository;
import com.parkflow.modules.tickets.repository.PrintJobRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class PrintJobServiceTest {

  @Mock private PrintJobRepository printJobRepository;
  @Mock private PrintAttemptRepository printAttemptRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private AppUserRepository appUserRepository;

  @InjectMocks private PrintJobService printJobService;

  private UUID sessionId;
  private UUID operatorId;
  private ParkingSession session;
  private AppUser operator;

  @BeforeEach
  void setUp() {
    sessionId = UUID.randomUUID();
    operatorId = UUID.randomUUID();
    session = new ParkingSession();
    session.setId(sessionId);
    session.setTicketNumber("T-A-000001");
    operator = new AppUser();
    operator.setId(operatorId);
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
    existing.setPayloadHash("abc");
    when(printJobRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));

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
    when(printJobRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
    when(printJobRepository.existsBySession_IdAndDocumentTypeAndStatusIn(
            eq(sessionId), eq(PrintDocumentType.ENTRY), any()))
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
    job.setAttempts(0);
    when(printAttemptRepository.findByAttemptKey(attemptKey))
        .thenReturn(Optional.of(new com.parkflow.modules.tickets.entity.PrintAttempt()));
    when(printJobRepository.findById(jobId)).thenReturn(Optional.of(job));

    var res =
        printJobService.updateStatus(
            jobId, new UpdatePrintJobStatusRequest(attemptKey, PrintJobStatus.ACKED, null));

    assertThat(res.status()).isEqualTo(PrintJobStatus.SENT);
    verify(printJobRepository, never()).save(any());
  }

  @Test
  void create_persistsSnapshotAndTerminal() {
    var key = "pj:new";
    when(printJobRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
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
