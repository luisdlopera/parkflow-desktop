package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.TicketCounter;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketCounterRepository extends JpaRepository<TicketCounter, String> {

  /**
   * PERFORMANCE/RELIABILITY: Pessimistic write lock prevents race conditions
   * when multiple concurrent requests try to increment the ticket counter.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT c FROM TicketCounter c WHERE c.counterKey = :key")
  Optional<TicketCounter> findByIdForUpdate(@Param("key") String key);
}
