package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashClosingReport;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashClosingReportRepository extends JpaRepository<CashClosingReport, UUID> {
  Optional<CashClosingReport> findByCashSession_Id(UUID cashSessionId);
}
