package com.parkflow.modules.tickets.repository;

import com.parkflow.modules.tickets.entity.PrintAttempt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrintAttemptRepository extends JpaRepository<PrintAttempt, UUID> {
  Optional<PrintAttempt> findByAttemptKey(String attemptKey);

  List<PrintAttempt> findByPrintJob_IdOrderByCreatedAtDesc(UUID printJobId);
}
