package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.SessionEvent;
import java.util.List;
import java.util.UUID;

public interface SessionEventPort {
  SessionEvent save(SessionEvent event);

  List<SessionEvent> findReprintEventsByTicketNumber(String ticketNumber, UUID companyId);
}
