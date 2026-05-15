package com.parkflow.modules.settings.infrastructure.persistence;

import com.parkflow.modules.settings.domain.repository.ParkingParametersPort;
import com.parkflow.modules.settings.domain.ParkingParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ParkingParametersJpaAdapter implements ParkingParametersPort {

    private final ParkingParametersJpaRepository jpaRepository;

    @Override
    public Optional<ParkingParameters> findBySiteCode(String siteCode) {
        return jpaRepository.findBySiteCode(siteCode);
    }

    @Override
    public ParkingParameters save(ParkingParameters parameters) {
        return jpaRepository.save(parameters);
    }

    @Repository
    interface ParkingParametersJpaRepository extends JpaRepository<ParkingParameters, String> {
        Optional<ParkingParameters> findBySiteCode(String siteCode);
    }
}
