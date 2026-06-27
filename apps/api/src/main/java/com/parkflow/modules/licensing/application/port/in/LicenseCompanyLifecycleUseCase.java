package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;

public interface LicenseCompanyLifecycleUseCase {
  Company createFrom(CreateCompanyRequest request);
  void applyUpdate(Company company, UpdateCompanyRequest request);
}
