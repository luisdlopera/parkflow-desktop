package com.parkflow.modules.support.application.port.in;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import com.parkflow.modules.support.application.port.out.TicketRepositoryPort;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface TicketUseCase {
  Ticket createTicket(CreateTicketRequest request);
  Ticket assignTicket(UUID ticketId, UUID agentId);
  Ticket updateStatus(UUID ticketId, TicketStatus newStatus);
  List<Ticket> findAllByTenantId(UUID tenantId);
  Ticket findById(UUID id);
  void addMessageToTicket(UUID ticketId, String content);
}
