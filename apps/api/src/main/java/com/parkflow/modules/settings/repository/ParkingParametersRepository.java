package com.parkflow.modules.settings.repository;

import com.parkflow.modules.settings.entity.ParkingParameters;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingParametersRepository extends JpaRepository<ParkingParameters, UUID> {
  Optional<ParkingParameters> findBySiteCode(String siteCode);
}
