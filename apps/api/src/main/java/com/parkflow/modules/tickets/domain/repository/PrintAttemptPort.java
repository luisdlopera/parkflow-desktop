package com.parkflow.modules.tickets.domain.repository;

import com.parkflow.modules.tickets.domain.PrintAttempt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrintAttemptPort {
  Optional<PrintAttempt> findByAttemptKey(String attemptKey);

  List<PrintAttempt> findByPrintJob_IdOrderByCreatedAtDesc(UUID printJobId);

  PrintAttempt save(PrintAttempt attempt);
}
