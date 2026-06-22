package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import java.util.List;
import java.util.UUID;

public interface VehicleTypeUseCase {
    List<VehicleTypeResponse> listAll();
    VehicleTypeResponse create(VehicleTypeRequest request);
    VehicleTypeResponse update(UUID id, VehicleTypeRequest request);
    void delete(UUID id);
}
