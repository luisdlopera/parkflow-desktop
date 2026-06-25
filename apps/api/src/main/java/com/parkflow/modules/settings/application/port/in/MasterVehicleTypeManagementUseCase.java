package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import java.util.List;
import java.util.UUID;

/**
 * Use case for managing global/master vehicle types.
 * Responsible for CRUD operations on master vehicle type catalog.
 * Single responsibility: Master type lifecycle management.
 */
public interface MasterVehicleTypeManagementUseCase {
    List<VehicleTypeResponse> listAll();
    VehicleTypeResponse create(VehicleTypeRequest request);
    VehicleTypeResponse update(UUID id, VehicleTypeRequest request);
    void patchStatus(UUID id, boolean active);
    void delete(UUID id);
}
