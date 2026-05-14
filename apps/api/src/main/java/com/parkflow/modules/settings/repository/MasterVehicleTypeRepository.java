package com.parkflow.modules.settings.repository;

import com.parkflow.modules.settings.domain.MasterVehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface MasterVehicleTypeRepository extends JpaRepository<MasterVehicleType, UUID> {
    Optional<MasterVehicleType> findByCode(String code);
    java.util.List<MasterVehicleType> findAllByOrderByDisplayOrderAscNameAsc();
}
