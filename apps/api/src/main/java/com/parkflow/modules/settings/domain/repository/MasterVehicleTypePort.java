package com.parkflow.modules.settings.domain.repository;

import com.parkflow.modules.settings.domain.MasterVehicleType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MasterVehicleTypePort {
    List<MasterVehicleType> findAllByOrderByDisplayOrderAscNameAsc();
    Optional<MasterVehicleType> findByCode(String code);
    Optional<MasterVehicleType> findById(UUID id);
    MasterVehicleType save(MasterVehicleType type);
    void delete(MasterVehicleType type);
}
