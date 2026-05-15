package com.parkflow.modules.tickets.infrastructure.persistence;

import com.parkflow.modules.tickets.domain.PrintAttempt;
import com.parkflow.modules.tickets.domain.repository.PrintAttemptPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Component
@RequiredArgsConstructor
public class PrintAttemptJpaAdapter implements PrintAttemptPort {

  private final PrintAttemptJpaRepository jpaRepository;

  @Override
  public Optional<PrintAttempt> findByAttemptKey(String attemptKey) {
    return jpaRepository.findByAttemptKey(attemptKey);
  }

  @Override
  public List<PrintAttempt> findByPrintJob_IdOrderByCreatedAtDesc(UUID printJobId) {
    return jpaRepository.findByPrintJob_IdOrderByCreatedAtDesc(printJobId);
  }

  @Override
  public PrintAttempt save(PrintAttempt attempt) {
    return jpaRepository.save(attempt);
  }

  @Repository
  interface PrintAttemptJpaRepository extends JpaRepository<PrintAttempt, UUID> {
    Optional<PrintAttempt> findByAttemptKey(String attemptKey);

    List<PrintAttempt> findByPrintJob_IdOrderByCreatedAtDesc(UUID printJobId);
  }
}
