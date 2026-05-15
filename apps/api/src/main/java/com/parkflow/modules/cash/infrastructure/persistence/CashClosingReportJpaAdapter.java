package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashClosingReport;
import com.parkflow.modules.cash.domain.repository.CashClosingReportPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CashClosingReportJpaAdapter implements CashClosingReportPort {

    private final CashClosingReportJpaRepository jpaRepository;

    @Override
    public Optional<CashClosingReport> findByCashSession_Id(UUID cashSessionId) {
        return jpaRepository.findByCashSession_Id(cashSessionId);
    }

    @Override
    public CashClosingReport save(CashClosingReport report) {
        return jpaRepository.save(report);
    }

    @Override
    public Optional<CashClosingReport> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public void delete(CashClosingReport report) {
        jpaRepository.delete(report);
    }

    @Repository
    interface CashClosingReportJpaRepository extends JpaRepository<CashClosingReport, UUID> {
        Optional<CashClosingReport> findByCashSession_Id(UUID cashSessionId);
    }
}
