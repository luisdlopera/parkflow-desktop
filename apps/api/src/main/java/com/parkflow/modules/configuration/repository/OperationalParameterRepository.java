package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.OperationalParameter;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperationalParameterRepository extends JpaRepository<OperationalParameter, UUID> {

  Optional<OperationalParameter> findBySite_Id(UUID siteId);

  boolean existsBySite_Id(UUID siteId);
}
