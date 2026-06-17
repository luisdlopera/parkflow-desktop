package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.BlacklistedPlate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlacklistedPlateRepository extends JpaRepository<BlacklistedPlate, UUID> {

  Optional<BlacklistedPlate> findByCompanyIdAndPlateIgnoreCaseAndActiveTrue(UUID companyId, String plate);
}
