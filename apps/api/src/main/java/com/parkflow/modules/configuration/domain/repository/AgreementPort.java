package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.Agreement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface AgreementPort {
  Optional<Agreement> findByCodeAndCompanyId(String code, UUID companyId);
  Optional<Agreement> findByCodeAndIsActiveTrueAndCompanyId(String code, UUID companyId);
  Page<Agreement> search(String site, String q, Boolean active, UUID companyId, Pageable pageable);
  boolean existsByCodeAndIdNotAndCompanyId(String code, UUID excludeId, UUID companyId);
  boolean existsByCodeAndCompanyId(String code, UUID companyId);
  Agreement save(Agreement agreement);
  Optional<Agreement> findById(UUID id);
  
  // Default methods for easier usage in services
  default Optional<Agreement> findByCodeAndIsActiveTrue(String code, UUID companyId) {
    return findByCodeAndIsActiveTrueAndCompanyId(code, companyId);
  }
}
