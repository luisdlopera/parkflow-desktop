package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import java.util.List;
import java.util.UUID;

public interface CompanyManagementUseCase {
    CompanyResponse createCompany(CreateCompanyRequest request, String performedBy);
    CompanyResponse getCompany(UUID companyId);
    List<CompanyResponse> listAllCompanies();
    CompanyResponse updateCompany(UUID companyId, UpdateCompanyRequest request, String performedBy);
}
