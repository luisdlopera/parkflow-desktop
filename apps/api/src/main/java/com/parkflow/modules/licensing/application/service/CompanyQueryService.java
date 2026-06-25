package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.CompanyQueryUseCase;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles company query operations: get, list, search.
 * Max 3 methods (read-only queries).
 */
@Service
@RequiredArgsConstructor
public class CompanyQueryService implements CompanyQueryUseCase {

    private final CompanyPort companyRepository;
    private final CompanyResponseAssembler companyResponseAssembler;

    @Override
    @Transactional(readOnly = true)
    public CompanyResponse getCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new com.parkflow.modules.common.exception.domain.EntityNotFoundException("Company", companyId.toString()));
        return companyResponseAssembler.assemble(company);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponse> listAllCompanies() {
        return companyRepository.findByStatusNot(CompanyStatus.CANCELLED).stream()
                .map(companyResponseAssembler::assemble)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CompanyResponse> listAllCompaniesPaginated(Pageable pageable) {
        return companyRepository.findAll(pageable)
                .map(companyResponseAssembler::assemble);
    }

    @Transactional(readOnly = true)
    public List<CompanyResponse> searchCompanies(String query) {
        return companyRepository.findByNameContainingIgnoreCase(query).stream()
                .map(companyResponseAssembler::assemble)
                .toList();
    }
}
