package com.parkflow.modules.support.application.port.in;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import com.parkflow.modules.support.application.port.out.TicketRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

public interface TicketAutomationUseCase {
  void autoAssignTicket(UUID ticketId);
  void escalateTicket(UUID ticketId);
}
