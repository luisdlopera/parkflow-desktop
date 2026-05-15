package com.parkflow.modules.settings.domain.repository;

import com.parkflow.modules.settings.domain.ParkingParameters;
import java.util.Optional;

public interface ParkingParametersPort {
    Optional<ParkingParameters> findBySiteCode(String siteCode);
    ParkingParameters save(ParkingParameters parameters);
}
