package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.TicketCounter;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketCounterRepository extends JpaRepository<TicketCounter, String> {
}
