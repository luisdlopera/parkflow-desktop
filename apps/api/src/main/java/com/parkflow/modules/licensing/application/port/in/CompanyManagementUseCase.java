package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CompanyManagementUseCase {
    CompanyResponse createCompany(CreateCompanyRequest request, String performedBy);
    CompanyResponse getCompany(UUID companyId);
    List<CompanyResponse> listAllCompanies();
    Page<CompanyResponse> listAllCompaniesPaginated(Pageable pageable);
    List<CompanyResponse> searchCompanies(String query);
    CompanyResponse updateCompany(UUID companyId, UpdateCompanyRequest request, String performedBy);
    void deactivateCompany(UUID companyId, String performedBy);
    void deleteCompany(UUID companyId, String performedBy);
    void purgeCompany(UUID companyId, String performedBy);
}
