package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import java.util.List;
import java.util.UUID;

/**
 * Use case for managing company-scoped vehicle types.
 * Responsible for associating/dissociating master vehicle types with a company.
 * Single responsibility: Company-specific vehicle type bindings.
 */
public interface CompanyVehicleTypeManagementUseCase {
    List<VehicleTypeResponse> listByCompany(UUID companyId);
    VehicleTypeResponse addTypeToCompany(UUID companyId, String code);
    VehicleTypeResponse updateCompanyType(UUID id, VehicleTypeRequest request);
    void patchCompanyTypeStatus(UUID id, boolean active);
    void removeCompanyType(UUID id);
}
