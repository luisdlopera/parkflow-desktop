package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.CompanyResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Input port for company query operations: get, list, search.
 */
public interface CompanyQueryUseCase {
    CompanyResponse getCompany(UUID companyId);
    List<CompanyResponse> listAllCompanies();
    Page<CompanyResponse> listAllCompaniesPaginated(Pageable pageable);
}
