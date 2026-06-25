package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import java.util.UUID;

/**
 * Input port for company lifecycle operations: create, update, deactivate, delete.
 */
public interface CompanyLifecycleUseCase {
    CompanyResponse createCompany(CreateCompanyRequest request, String performedBy);
    CompanyResponse updateCompany(UUID companyId, UpdateCompanyRequest request, String performedBy);
    void deactivateCompany(UUID companyId, String performedBy);
    void deleteCompany(UUID companyId, String performedBy);
}
