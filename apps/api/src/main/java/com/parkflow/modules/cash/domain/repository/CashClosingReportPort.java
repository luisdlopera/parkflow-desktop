package com.parkflow.modules.cash.domain.repository;

import com.parkflow.modules.cash.domain.CashClosingReport;
import java.util.Optional;
import java.util.UUID;

public interface CashClosingReportPort {
    Optional<CashClosingReport> findByCashSession_Id(UUID cashSessionId);
    
    CashClosingReport save(CashClosingReport report);
    Optional<CashClosingReport> findById(UUID id);
    void delete(CashClosingReport report);
}
