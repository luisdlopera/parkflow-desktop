package com.parkflow.modules.tickets.application.port.in;

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

public interface PrintJobQueryUseCase {
  PrintJobResponse get(UUID id);
  List<PrintJobResponse> listBySession(UUID sessionId);
  List<PrintJobResponse> listByTicket(String ticketNumber);
}
