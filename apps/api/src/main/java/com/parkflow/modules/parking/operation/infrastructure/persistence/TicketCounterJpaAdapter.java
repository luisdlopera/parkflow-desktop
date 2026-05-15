package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.TicketCounter;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class TicketCounterJpaAdapter implements TicketCounterPort {

  private final TicketCounterJpaRepository jpaRepository;

  @Override
  public Optional<TicketCounter> findByIdForUpdate(String key) {
    return jpaRepository.findByIdForUpdate(key);
  }

  @Override
  public TicketCounter save(TicketCounter counter) {
    return jpaRepository.save(counter);
  }

  @Override
  public Optional<TicketCounter> findById(String key) {
    return jpaRepository.findById(key);
  }

  @Repository
  interface TicketCounterJpaRepository extends JpaRepository<TicketCounter, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM TicketCounter c WHERE c.counterKey = :key")
    Optional<TicketCounter> findByIdForUpdate(@Param("key") String key);
  }
}
