package com.parkflow.modules.support.application.port.in;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.application.port.out.TicketRepositoryPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface TicketQueryUseCase {
  List<Ticket> findAllByTenantId(UUID tenantId);
  Ticket findById(UUID id);
}
