package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.CompanyManagementUseCase;
import com.parkflow.modules.licensing.application.port.in.CompanyLifecycleUseCase;
import com.parkflow.modules.licensing.application.port.in.CompanyQueryUseCase;
import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Adapter that composes the query and lifecycle ports into the legacy company management port.
 */
@Service
@RequiredArgsConstructor
public class CompanyManagementService implements CompanyManagementUseCase {

  private final CompanyLifecycleUseCase companyLifecycleUseCase;
  private final CompanyQueryUseCase companyQueryUseCase;
  private final CompanyLifecycleService companyLifecycleService;

  @Override
  public CompanyResponse createCompany(CreateCompanyRequest request, String performedBy) {
    return companyLifecycleUseCase.createCompany(request, performedBy);
  }

  @Override
  public CompanyResponse getCompany(UUID companyId) {
    return companyQueryUseCase.getCompany(companyId);
  }

  @Override
  public List<CompanyResponse> listAllCompanies() {
    return companyQueryUseCase.listAllCompanies();
  }

  @Override
  public Page<CompanyResponse> listAllCompaniesPaginated(Pageable pageable) {
    return companyQueryUseCase.listAllCompaniesPaginated(pageable);
  }

  @Override
  public List<CompanyResponse> searchCompanies(String query) {
    return companyQueryUseCase.searchCompanies(query);
  }

  @Override
  public CompanyResponse updateCompany(UUID companyId, UpdateCompanyRequest request, String performedBy) {
    return companyLifecycleUseCase.updateCompany(companyId, request, performedBy);
  }

  @Override
  public void deactivateCompany(UUID companyId, String performedBy) {
    companyLifecycleUseCase.deactivateCompany(companyId, performedBy);
  }

  @Override
  public void deleteCompany(UUID companyId, String performedBy) {
    companyLifecycleUseCase.deleteCompany(companyId, performedBy);
  }

  @Override
  public void purgeCompany(UUID companyId, String performedBy) {
    companyLifecycleService.purgeCompany(companyId, performedBy);
  }
}
