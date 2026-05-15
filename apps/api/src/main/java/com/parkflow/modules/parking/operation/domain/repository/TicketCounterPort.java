package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.TicketCounter;
import java.util.Optional;

public interface TicketCounterPort {
  Optional<TicketCounter> findByIdForUpdate(String key);
  TicketCounter save(TicketCounter counter);
  Optional<TicketCounter> findById(String key);
}
