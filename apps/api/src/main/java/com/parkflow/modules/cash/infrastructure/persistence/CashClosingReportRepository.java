package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashClosingReport;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashClosingReportRepository extends JpaRepository<CashClosingReport, UUID> {
}
