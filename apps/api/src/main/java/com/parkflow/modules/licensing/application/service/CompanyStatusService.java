package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.CompanyStatusUseCase;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles company status monitoring: last payment tracking, sync coordination.
 * Max 2 methods.
 */
@Service
@RequiredArgsConstructor
public class CompanyStatusService implements CompanyStatusUseCase {

    private final CompanyPort companyRepository;

    @Override
    @Transactional
    public void recordLoginAttempt(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new com.parkflow.modules.common.exception.domain.EntityNotFoundException("Company", companyId.toString()));
        // Trigger @PreUpdate lifecycle to update timestamp
        company.setUpdatedAt(OffsetDateTime.now());
        companyRepository.save(company);
    }

    @Override
    @Transactional
    public void updateLastLogin(UUID companyId, OffsetDateTime timestamp) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new com.parkflow.modules.common.exception.domain.EntityNotFoundException("Company", companyId.toString()));
        // Update last payment tracking field for status monitoring
        company.setLastPaymentAt(timestamp);
        companyRepository.save(company);
    }
}
