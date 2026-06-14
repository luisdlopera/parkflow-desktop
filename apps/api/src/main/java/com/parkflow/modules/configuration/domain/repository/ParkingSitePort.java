package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.ParkingSite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

/**
 * Puerto de salida para persistencia de sedes de parqueo.
 */
public interface ParkingSitePort {
  Optional<ParkingSite> findByCodeAndCompanyId(String code, UUID companyId);
  Optional<ParkingSite> findByNameIgnoreCase(String name, UUID companyId);
  Optional<ParkingSite> findByCodeOrNameForUpdate(String site, UUID companyId);
  boolean existsByCodeAndCompanyId(String code, UUID companyId);
  Page<ParkingSite> search(UUID companyId, String q, Boolean active, Pageable pageable);
  ParkingSite save(ParkingSite site);
  Optional<ParkingSite> findById(UUID id);
}
