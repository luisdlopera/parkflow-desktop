package com.parkflow.modules.tickets.application.port.in;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
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

public interface PrintJobManagementUseCase {
  PrintJobResponse create(CreatePrintJobRequest request);
  PrintJobResponse updateStatus(UUID id, UpdatePrintJobStatusRequest request);
  PrintJobResponse retry(UUID id, RetryPrintJobRequest request);
}
