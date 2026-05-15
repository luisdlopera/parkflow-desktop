package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.OperationalParameter;
import java.util.Optional;
import java.util.UUID;

public interface OperationalParameterPort {
  Optional<OperationalParameter> findBySite_Id(UUID siteId);
  boolean existsBySite_Id(UUID siteId);
  OperationalParameter save(OperationalParameter parameter);
  Optional<OperationalParameter> findById(UUID id);
}
